import { describe, expect, it } from "vitest";
import { mapChatMessage, nextMessageCursor } from "@/lib/audit/map-message";
import { FanvueClient } from "@/lib/fanvue/client";
import { importPurchaseHistory } from "@/lib/fanvue/import-history";

const purchased = {
  uuid: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  text: "Three still lifes",
  sentAt: "2026-10-12T18:20:00.000Z",
  hasMedia: true,
  mediaType: "image",
  mediaUuids: [
    "55555555-5555-4555-8555-555555555555",
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  ],
  mediaPreviewUuid: "55555555-5555-4555-8555-555555555555",
  type: "SINGLE_RECIPIENT",
  pricing: { USD: { price: 1200 } },
  purchasedAt: "2026-10-12T18:24:00.000Z",
};

const sentOnly = {
  uuid: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  text: "Olive",
  sentAt: "2026-10-18T16:40:00.000Z",
  mediaUuids: ["66666666-6666-4666-8666-666666666666"],
  mediaPreviewUuid: null,
  type: "SINGLE_RECIPIENT",
  pricing: { USD: { price: 600 } },
  purchasedAt: null,
};

const broadcast = {
  uuid: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  text: "Postcard",
  sentAt: "2026-10-20T14:00:00.000Z",
  mediaUuids: ["77777777-7777-4777-8777-777777777777"],
  mediaPreviewUuid: null,
  type: "BROADCAST",
  pricing: { USD: { price: 800 } },
  purchasedAt: "2026-10-20T14:05:00.000Z",
};

describe("message mapping", () => {
  it("separates the free preview from paid attachments and ignores unpaid sends", () => {
    const bought = mapChatMessage(purchased);
    expect(bought?.purchased).toBe(true);
    expect(bought?.paidMediaIds).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ]);
    expect(bought?.paidMediaIds).not.toContain(purchased.mediaPreviewUuid);
    expect(bought?.previewMediaId).toBe(purchased.mediaPreviewUuid);
    expect(mapChatMessage(sentOnly)?.purchased).toBe(false);
    expect(mapChatMessage({ ...purchased, pricing: null, purchasedAt: purchased.purchasedAt })).toBeNull();
  });

  it("refuses to guess a next page when hasMore is missing", () => {
    expect(nextMessageCursor({ data: [purchased] }).paginationKnown).toBe(false);
    expect(nextMessageCursor({ data: [purchased], pagination: { hasMore: true } }).cursor).toBe(purchased.uuid);
    expect(nextMessageCursor({ data: [purchased], pagination: { hasMore: false } }).cursor).toBeNull();
  });
});

describe("per-chat import", () => {
  it("includes broadcast purchases, keeps previews out, and never marks chats read", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = input instanceof URL ? `${input.pathname}${input.search}` : String(input);
      calls.push(url);
      if (url.startsWith("/chats?")) {
        return json({
          data: [{ user: { uuid: "fan-1", handle: "jordan.hale", displayName: "Jordan Hale" } }],
          pagination: { hasMore: false },
        });
      }
      if (url.includes("/messages")) {
        expect(url).toContain("markAsRead=false");
        return json({
          data: [purchased, sentOnly, broadcast],
          pagination: { hasMore: false },
        });
      }
      throw new Error(`Unexpected ${url}`);
    };
    const draft = await importPurchaseHistory(new FanvueClient("token", fetchImpl, async () => undefined));
    expect(calls.some((url) => url.includes("/chats/messages/batch"))).toBe(false);
    expect(draft.broadcastsIncluded).toBe(true);
    expect(draft.historyComplete).toBe(true);
    expect(draft.purchases.map((item) => item.messageType).sort()).toEqual(["BROADCAST", "SINGLE_RECIPIENT"]);
    expect(draft.sentOffers).toHaveLength(1);
    expect(draft.purchases.find((item) => item.messageId === purchased.uuid)?.paidMediaIds).not.toContain(
      purchased.mediaPreviewUuid,
    );
    expect(draft.fanByMessage[broadcast.uuid]).toBe("fan-1");
  });

  it("marks coverage incomplete when a message page omits hasMore", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = input instanceof URL ? `${input.pathname}${input.search}` : String(input);
      if (url.startsWith("/chats?")) {
        return json({ data: [{ user: { uuid: "fan-1", handle: "a", displayName: "A" } }] });
      }
      return json({ data: [purchased] });
    };
    const draft = await importPurchaseHistory(new FanvueClient("token", fetchImpl, async () => undefined));
    expect(draft.historyComplete).toBe(false);
    expect(draft.gaps.some((gap) => gap.includes("hasMore"))).toBe(true);
  });

  it("follows beforeMessageUuid and stops on the second page", async () => {
    const cursors: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = input instanceof URL ? `${input.pathname}${input.search}` : String(input);
      if (url.startsWith("/chats?")) {
        return json({ data: [{ user: { uuid: "fan-1", handle: "a", displayName: "A" } }], pagination: { hasMore: false } });
      }
      const parsed = new URL(url, "https://api.fanvue.com");
      cursors.push(parsed.searchParams.get("beforeMessageUuid") ?? "");
      if (!parsed.searchParams.get("beforeMessageUuid")) {
        return json({ data: [purchased], pagination: { hasMore: true } });
      }
      return json({ data: [broadcast], pagination: { hasMore: false } });
    };
    const draft = await importPurchaseHistory(new FanvueClient("token", fetchImpl, async () => undefined));
    expect(cursors).toEqual(["", purchased.uuid]);
    expect(draft.purchases).toHaveLength(2);
    expect(draft.messagesScanned).toBe(2);
  });
});

describe("rate limit retry", () => {
  it("waits for Retry-After and does not treat a 429 as success", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { "Retry-After": "0", "content-type": "application/json" },
        });
      }
      return json({ ok: true });
    };
    const client = new FanvueClient("token", fetchImpl, async () => undefined);
    await expect(client.getJson("/users/me")).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", "x-ratelimit-remaining": "100" },
  });
}
