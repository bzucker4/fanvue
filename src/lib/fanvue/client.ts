import { API_BASE, API_VERSION } from "./config";

export class FanvueApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
    readonly ageVerificationUrl?: string,
  ) {
    super(message);
    this.name = "FanvueApiError";
  }
}

export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
  retryAfter: number | null;
}

export function readRateLimit(headers: Headers): RateLimitInfo {
  const num = (name: string) => {
    const value = headers.get(name);
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    reset: num("x-ratelimit-reset"),
    retryAfter: num("retry-after"),
  };
}

export function retryAfterSeconds(info: RateLimitInfo): number {
  if (info.retryAfter !== null && info.retryAfter >= 0) return info.retryAfter;
  return 1;
}

const MAX_CONCURRENCY = 5;

export class FanvueClient {
  private inFlight = 0;
  private waiters: Array<() => void> = [];

  constructor(
    private readonly accessToken: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async getJson<T>(path: string): Promise<T> {
    const response = await this.request(path, { method: "GET" });
    return (await response.json()) as T;
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as T;
  }

  private async request(path: string, init: RequestInit, attempt = 0): Promise<Response> {
    await this.acquire();
    try {
      const response = await this.fetchImpl(new URL(path, API_BASE), {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "X-Fanvue-API-Version": API_VERSION,
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
      });
      const limit = readRateLimit(response.headers);
      if (response.status === 429 && attempt < 4) {
        await this.sleep(retryAfterSeconds(limit) * 1000);
        return this.request(path, init, attempt + 1);
      }
      if (response.status === 429) {
        throw new FanvueApiError("Fanvue rate limit exceeded.", 429, await safeJson(response));
      }
      if (!response.ok) {
        const body = await safeJson(response);
        const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        throw new FanvueApiError(
          typeof record.message === "string"
            ? record.message
            : typeof record.error === "string"
              ? record.error
              : `Fanvue request failed (${response.status}).`,
          response.status,
          body,
          typeof record.ageVerificationUrl === "string" ? record.ageVerificationUrl : undefined,
        );
      }
      if (limit.remaining !== null && limit.remaining < 5) {
        await this.sleep(250);
      }
      return response;
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.inFlight < MAX_CONCURRENCY) {
      this.inFlight += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.inFlight += 1;
  }

  private release(): void {
    this.inFlight -= 1;
    const next = this.waiters.shift();
    if (next) next();
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
