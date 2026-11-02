import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  id: string;
  exp: number;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueSessionToken(sessionId: string, secret: string, ttlMs: number, now = Date.now()): string {
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  const body: SessionPayload = { id: sessionId, exp: now + ttlMs };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readSessionToken(token: string, secret: string, now = Date.now()): SessionPayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (!body.id || typeof body.exp !== "number" || body.exp < now) return null;
    return body;
  } catch {
    return null;
  }
}

export function randomId(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
