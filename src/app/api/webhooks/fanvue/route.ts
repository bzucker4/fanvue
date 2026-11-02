import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readFanvueConfig } from "@/lib/fanvue/config";
import { isVerificationProbe, verifyFanvueSignature } from "@/lib/fanvue/signature";
import { decideWebhook, type Envelope } from "@/lib/fanvue/webhooks";
import { recordReversal } from "@/lib/live/apply-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
  const decision = decideWebhook(event, Boolean(existing));
  if (decision.action === "reject") {
    return Response.json({ error: decision.reason }, { status: 400 });
  }
  if (decision.action === "ignore_duplicate") {
    return new Response(null, { status: 200 });
  }

  const creatorUuid = creatorFrom(event);
  const workspace = creatorUuid
    ? await prisma.workspace.findUnique({ where: { fanvueUserUuid: creatorUuid } })
    : null;

  await prisma.webhookEvent.create({
    data: {
      id: eventId,
      type: decision.type,
      workspaceId: workspace?.id ?? null,
    },
  });

  if (workspace?.mode === "live") {
    if (decision.action === "store_reversal") {
      await recordReversal(prisma, workspace.id, decision.reversal);
    }
    if (
      (decision.action === "store_payment" || decision.action === "store_message_signal") &&
      decision.hydration
    ) {
      const hydration = decision.hydration;
      if (hydration.source && hydration.source !== "message" && decision.action === "store_payment") {
        await noteUnsupported(workspace.id, `Payment ${hydration.invoiceId ?? ""} source “${hydration.source}” is not a PPV chat attachment.`);
      } else {
        await prisma.pendingHydration.create({
          data: {
            workspaceId: workspace.id,
            kind: hydration.kind,
            messageId: hydration.messageId,
            fanvueFanId: hydration.fanvueFanId,
            invoiceId: hydration.invoiceId,
            payload: hydration as unknown as Prisma.InputJsonValue,
            status: "pending",
          },
        });
        await prisma.importState.upsert({
          where: { workspaceId: workspace.id },
          create: {
            workspaceId: workspace.id,
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
    }
  }

  return new Response(null, { status: 200 });
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

async function noteUnsupported(workspaceId: string, note: string) {
  const state = await prisma.importState.findUnique({ where: { workspaceId } });
  const unsupported = Array.isArray(state?.unsupported) ? state.unsupported.filter((item): item is string => typeof item === "string") : [];
  if (!unsupported.includes(note)) unsupported.push(note);
  await prisma.importState.upsert({
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
