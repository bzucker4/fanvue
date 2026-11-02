/**
 * Webhook facts used by the receiver:
 * - Deduplicate envelope events on `id`. A retry keeps the same id and changes `timestamp`.
 * - creator.payment.succeeded for source=message carries message_uuid, not media ids.
 * - Refunds and disputes are separate records. They do not erase the purchase.
 * - Message events omit purchasedAt and mediaPreviewUuid, so they schedule a per-chat read.
 * - Unknown topics return success after being stored, so Fanvue does not disable the endpoint.
 */

export interface Envelope {
  id?: string;
  type?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

export type WebhookDecision =
  | { action: "ignore_duplicate"; eventId: string; type: string }
  | { action: "store_payment"; eventId: string; type: string; hydration: HydrationRequest }
  | { action: "store_reversal"; eventId: string; type: string; reversal: ReversalDraft }
  | { action: "store_message_signal"; eventId: string; type: string; hydration: HydrationRequest | null }
  | { action: "store_only"; eventId: string; type: string; note: string };

export interface HydrationRequest {
  kind: "message_purchase" | "message_signal";
  messageId: string | null;
  fanvueFanId: string | null;
  invoiceId: string | null;
  messageType: string | null;
  gross: number | null;
  source: string | null;
}

export interface ReversalDraft {
  externalId: string;
  kind: "refund" | "dispute_flagged" | "dispute_open";
  invoiceId: string | null;
  amountCents: number | null;
  fanvueFanId: string | null;
}

export function idempotencyKey(event: Envelope): string | null {
  return typeof event.id === "string" && event.id.length > 0 ? event.id : null;
}

export function decideWebhook(event: Envelope, alreadySeen: boolean): WebhookDecision | { action: "reject"; reason: string } {
  const eventId = idempotencyKey(event);
  const type = event.type ?? "";
  if (!eventId || !type) return { action: "reject", reason: "Event is missing id or type." };
  if (alreadySeen) return { action: "ignore_duplicate", eventId, type };
  if (isSyntheticFanvueEvent(event)) {
    return {
      action: "store_only",
      eventId,
      type,
      note: "Fanvue test delivery. Stored for idempotency. No purchase, reversal, or hydration was written.",
    };
  }

  const data = event.data ?? {};
  if (type === "creator.payment.succeeded") {
    const source = stringField(data, "source");
    return {
      action: "store_payment",
      eventId,
      type,
      hydration: {
        kind: "message_purchase",
        messageId: stringField(data, "message_uuid"),
        fanvueFanId: nestedUuid(data, "purchaser"),
        invoiceId: stringField(data, "id"),
        messageType: stringField(data, "message_type"),
        gross: numberField(data, "gross"),
        source,
      },
    };
  }

  if (type === "creator.refund.created") {
    return {
      action: "store_reversal",
      eventId,
      type,
      reversal: {
        externalId: eventId,
        kind: "refund",
        invoiceId: stringField(data, "payment_id"),
        amountCents: numberField(data, "amount"),
        fanvueFanId: nestedUuid(data, "purchaser"),
      },
    };
  }

  if (type === "creator.dispute.flagged" || type === "creator.dispute.created") {
    const payment = data.payment && typeof data.payment === "object" ? (data.payment as Record<string, unknown>) : {};
    return {
      action: "store_reversal",
      eventId,
      type,
      reversal: {
        externalId: eventId,
        kind: type === "creator.dispute.flagged" ? "dispute_flagged" : "dispute_open",
        invoiceId: stringField(payment, "id"),
        amountCents: numberField(data, "amount"),
        fanvueFanId: nestedUuid(payment, "purchaser"),
      },
    };
  }

  if (
    type === "creator.message.received" ||
    type === "creator.message.sent" ||
    type === "creator.message.mass_sent"
  ) {
    const fan = data.fan && typeof data.fan === "object" ? (data.fan as Record<string, unknown>) : {};
    const messageId = stringField(data, "uuid");
    return {
      action: "store_message_signal",
      eventId,
      type,
      hydration: messageId
        ? {
            kind: "message_signal",
            messageId,
            fanvueFanId: typeof fan.uuid === "string" ? fan.uuid : null,
            invoiceId: null,
            messageType: stringField(data, "message_type"),
            gross: numberField(data, "price"),
            source: "message",
          }
        : null,
    };
  }

  return {
    action: "store_only",
    eventId,
    type,
    note: "Stored for idempotency. This topic does not change photo purchase evidence.",
  };
}

/**
 * Events-tab and POST /webhooks/test deliveries are synthetic.
 * Fanvue prefixes their identifiers with TEST-, sets purchaser.email to test@example.com,
 * and on creator.payment.succeeded sets transaction_id. Production payments leave both null.
 * The unsigned fanvue.webhook.verification probe never reaches this function.
 */
export function isSyntheticFanvueEvent(event: Envelope): boolean {
  return containsSyntheticMarker(event.data ?? {}, null, event.type ?? "");
}

function containsSyntheticMarker(value: unknown, key: string | null, eventType: string): boolean {
  if (typeof value === "string") {
    if (key === "email" && value === "test@example.com") return true;
    if (key === "transaction_id" && eventType === "creator.payment.succeeded" && value.length > 0) return true;
    if (key && isIdentifierKey(key) && value.startsWith("TEST-")) return true;
    return false;
  }
  if (Array.isArray(value)) return value.some((item) => containsSyntheticMarker(item, key, eventType));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([childKey, child]) => containsSyntheticMarker(child, childKey, eventType));
  }
  return false;
}

function isIdentifierKey(key: string): boolean {
  return key === "id" || key === "uuid" || key.endsWith("_id") || key.endsWith("_uuid");
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" ? value : null;
}

function nestedUuid(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (!value || typeof value !== "object") return null;
  const uuid = (value as Record<string, unknown>).uuid;
  return typeof uuid === "string" ? uuid : null;
}
