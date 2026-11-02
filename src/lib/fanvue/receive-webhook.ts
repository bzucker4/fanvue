import { Prisma, type PrismaClient } from "@prisma/client";
import { readFanvueConfig } from "./config";
import { isVerificationProbe, verifyFanvueSignature } from "./signature";
import { decideWebhook, type Envelope, type HydrationRequest } from "./webhooks";
import { recordReversal } from "../live/apply-import";

/**
 * Persist the event id before side effects. Mark it processed only after those writes succeed.
 * A 500 leaves the row unprocessed so Fanvue's retry is applied again instead of dropped as a duplicate.
 * Returning 200 before the write would make that retry a no-op.
 */
export async function handleFanvueWebhook(db: PrismaClient, request: Request): Promise<Response> {
  const rawBody = await request.text();
  if (isVerificationProbe(rawBody)) {
    return new Response(null, { status: 200 });
  }

  const config = readFanvueConfig();
  if (!config.webhookSecret) {
    return Response.json({ error: "Webhook secret is not configured." }, { status: 503 });
  }
  const check = verifyFanvueSignature(rawBody, request.headers.get("x-fanvue-signature"), config.webhookSecret);
  if (!check.ok) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: Envelope;
  try {
    event = JSON.parse(rawBody) as Envelope;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventId = typeof event.id === "string" ? event.id : "";
  if (!eventId) {
    return Response.json({ error: "Event id is required." }, { status: 400 });
  }

  const existing = await db.webhookEvent.findUnique({ where: { id: eventId } });
  const decision = decideWebhook(event, Boolean(existing?.processed));
  if (decision.action === "reject") {
    return Response.json({ error: decision.reason }, { status: 400 });
  }
  if (decision.action === "ignore_duplicate") {
    return new Response(null, { status: 200 });
  }

  const creatorUuid = creatorFrom(event);
  const workspace = creatorUuid
    ? await db.workspace.findUnique({ where: { fanvueUserUuid: creatorUuid } })
    : null;

  if (!existing) {
    try {
      await db.webhookEvent.create({
        data: {
          id: eventId,
          type: decision.type,
          workspaceId: workspace?.id ?? null,
          processed: false,
        },
      });
    } catch (error) {
      if (!isUnique(error)) throw error;
      const raced = await db.webhookEvent.findUnique({ where: { id: eventId } });
      if (raced?.processed) return new Response(null, { status: 200 });
    }
  }

  try {
    if (workspace?.mode === "live") {
      if (decision.action === "store_reversal") {
        await recordReversal(db, workspace.id, decision.reversal);
      }
      if (
        (decision.action === "store_payment" || decision.action === "store_message_signal") &&
        decision.hydration
      ) {
        await storeHydration(db, workspace.id, decision.hydration, decision.action);
      }
    }
    await db.webhookEvent.update({ where: { id: eventId }, data: { processed: true } });
  } catch {
    return Response.json({ error: "Event was stored and will be retried." }, { status: 500 });
  }

  return new Response(null, { status: 200 });
}

async function storeHydration(
  db: PrismaClient,
  workspaceId: string,
  hydration: HydrationRequest,
  action: "store_payment" | "store_message_signal",
) {
  if (hydration.source && hydration.source !== "message" && action === "store_payment") {
    await noteUnsupported(
      db,
      workspaceId,
      `Payment ${hydration.invoiceId ?? ""} source “${hydration.source}” is not a PPV chat attachment.`,
    );
    return;
  }

  const already = hydration.messageId
    ? await db.pendingHydration.findFirst({
        where: {
          workspaceId,
          kind: hydration.kind,
          messageId: hydration.messageId,
          status: "pending",
        },
      })
    : null;
  if (!already) {
    await db.pendingHydration.create({
      data: {
        workspaceId,
        kind: hydration.kind,
        messageId: hydration.messageId,
        fanvueFanId: hydration.fanvueFanId,
        invoiceId: hydration.invoiceId,
        payload: hydration as unknown as Prisma.InputJsonValue,
        status: "pending",
      },
    });
  }
  await db.importState.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      status: "incomplete",
      historyComplete: false,
      broadcastsIncluded: false,
      gaps: ["A payment or message event is waiting for a per-chat history read."],
      unsupported: [],
      methodNote: "Webhook stored. Media and purchase timestamps are read from per-chat history, not invented from the event.",
    },
    update: { status: "incomplete", historyComplete: false },
  });
}

function creatorFrom(event: Envelope): string | null {
  const data = event.data;
  if (!data) return null;
  const creator = data.creator;
  if (creator && typeof creator === "object" && typeof (creator as { uuid?: string }).uuid === "string") {
    return (creator as { uuid: string }).uuid;
  }
  return null;
}

async function noteUnsupported(db: PrismaClient, workspaceId: string, note: string) {
  const state = await db.importState.findUnique({ where: { workspaceId } });
  const unsupported = Array.isArray(state?.unsupported)
    ? state.unsupported.filter((item): item is string => typeof item === "string")
    : [];
  if (!unsupported.includes(note)) unsupported.push(note);
  await db.importState.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      status: state?.status ?? "idle",
      historyComplete: state?.historyComplete ?? false,
      broadcastsIncluded: state?.broadcastsIncluded ?? false,
      gaps: Array.isArray(state?.gaps) ? state.gaps : [],
      unsupported,
      methodNote: state?.methodNote ?? "Webhook received.",
    },
    update: { unsupported },
  });
}

function isUnique(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
