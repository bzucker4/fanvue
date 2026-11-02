import type { PrismaClient } from "@prisma/client";
import { validationBypassForCreator } from "../fanvue/config";
import { importPurchaseHistory, listMediaMetadata } from "../fanvue/import-history";
import { readEntitlement } from "../fanvue/entitlement";
import { applyLiveImport } from "./apply-import";
import { describeImportFailure, importStoppedBeforeAnyChat } from "./import-failure";
import { liveImportDecision } from "./import-gate";
import { authorizedClient } from "./tokens";

export async function runLiveImport(db: PrismaClient, workspaceId: string) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || workspace.mode !== "live") {
    throw new Error("Live import is only available in a connected Fanvue workspace.");
  }
  const { client, config } = await authorizedClient(db, workspaceId);
  const entitlement = await readEntitlement(config, client, workspace.fanvueUserUuid);
  const decision = liveImportDecision(
    entitlement,
    validationBypassForCreator(process.env, workspace.fanvueUserUuid),
  );
  if (!decision.allow) {
    throw new Error(decision.message);
  }
  const draft = await importPurchaseHistory(client);
  if (importStoppedBeforeAnyChat(draft)) {
    throw new Error(describeImportFailure(new Error(draft.gaps[0] ?? "Import failed before any chat could be read.")));
  }
  const media = await listMediaMetadata(client);
  if (!media.complete && media.gap) {
    draft.historyComplete = false;
    draft.gaps.push(media.gap);
  }
  await applyLiveImport(db, workspaceId, draft, media.items, { billingMode: decision.billingMode });
  await settleHydrations(db, workspaceId, draft.historyComplete);
  const state = await db.importState.findUnique({ where: { workspaceId } });
  return state?.status === "ready" ? ("ready" as const) : ("incomplete" as const);
}

async function settleHydrations(db: PrismaClient, workspaceId: string, historyComplete: boolean) {
  const pending = await db.pendingHydration.findMany({ where: { workspaceId, status: "pending" } });
  let unresolved = 0;
  let unresolvedWithoutFan = 0;
  for (const item of pending) {
    if (!item.messageId) {
      unresolved += 1;
      if (!item.fanvueFanId) unresolvedWithoutFan += 1;
      continue;
    }
    const purchase = await db.purchase.findUnique({
      where: { workspaceId_messageId: { workspaceId, messageId: item.messageId } },
    });
    const sent = await db.sentOffer.findUnique({
      where: { workspaceId_messageId: { workspaceId, messageId: item.messageId } },
    });
    if (purchase || sent) {
      if (purchase && item.invoiceId && !purchase.invoiceId) {
        await db.purchase.update({ where: { id: purchase.id }, data: { invoiceId: item.invoiceId } });
        await db.reversal.updateMany({
          where: { workspaceId, invoiceId: item.invoiceId, purchaseId: null },
          data: { purchaseId: purchase.id },
        });
      }
      await db.pendingHydration.update({ where: { id: item.id }, data: { status: "resolved" } });
    } else {
      unresolved += 1;
      if (!item.fanvueFanId) unresolvedWithoutFan += 1;
    }
  }
  if (unresolved > 0) {
    const state = await db.importState.findUnique({ where: { workspaceId } });
    const gaps = Array.isArray(state?.gaps) ? state.gaps.filter((gap): gap is string => typeof gap === "string") : [];
    const unscoped = unresolvedWithoutFan;
    gaps.push(
      `${unresolved} webhook event${unresolved === 1 ? "" : "s"} still need a per-chat read before their photos can be audited.${
        unscoped > 0
          ? " A mass-message event has no fan list. Its uuid is not assumed to equal each fan's copy."
          : ""
      }`,
    );
    await db.importState.update({
      where: { workspaceId },
      data: { historyComplete: false, status: "incomplete", gaps },
    });
  } else if (!historyComplete) {
    await db.importState.update({
      where: { workspaceId },
      data: { historyComplete: false, status: "incomplete" },
    });
  }
}
