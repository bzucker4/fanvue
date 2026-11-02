"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canonicalPair } from "@/lib/audit/duplicates";
import { prisma } from "@/lib/db";
import { createDemoWorkspace } from "@/lib/demo/seed";
import { readFanvueConfig } from "@/lib/fanvue/config";
import { erasureConfirmed } from "@/lib/deletion";
import { describeImportFailure } from "@/lib/live/import-failure";
import { runLiveImport } from "@/lib/live/run-import";
import { clearSessionCookie, writeSessionCookie } from "@/lib/session-cookie";
import { requireWorkspace } from "@/lib/workspace-gate";

export async function startDemo() {
  const config = readFanvueConfig();
  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    redirect("/connect?error=session");
  }
  const { sessionId } = await createDemoWorkspace(prisma);
  await writeSessionCookie(sessionId);
  redirect("/workspace/connection");
}

export async function leaveWorkspace() {
  await clearSessionCookie();
  redirect("/");
}

async function workspaceOrRedirect() {
  const workspace = await requireWorkspace();
  if (!workspace) redirect("/");
  return workspace;
}

export async function setDuplicateStatus(formData: FormData) {
  const workspace = await workspaceOrRedirect();
  const status = String(formData.get("status"));
  if (status !== "confirmed" && status !== "rejected" && status !== "reversed" && status !== "suggested") {
    return;
  }
  const [left, right] = canonicalPair(String(formData.get("left") ?? ""), String(formData.get("right") ?? ""));
  const uploads = await prisma.upload.findMany({
    where: { workspaceId: workspace.id, id: { in: [left, right] } },
  });
  if (uploads.length !== 2 || uploads.some((upload) => upload.kind !== "image")) return;
  await prisma.duplicateEdge.upsert({
    where: {
      workspaceId_leftUploadId_rightUploadId: {
        workspaceId: workspace.id,
        leftUploadId: left,
        rightUploadId: right,
      },
    },
    create: {
      workspaceId: workspace.id,
      leftUploadId: left,
      rightUploadId: right,
      status,
      note: "Recorded by the creator in this workspace.",
    },
    update: { status, note: "Recorded by the creator in this workspace." },
  });
  revalidatePath("/workspace/library");
  revalidatePath("/workspace/bundles", "layout");
}

export async function createBundle(formData: FormData) {
  const workspace = await workspaceOrRedirect();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  const bundle = await prisma.bundle.create({
    data: { workspaceId: workspace.id, name },
  });
  redirect(`/workspace/bundles/${bundle.id}`);
}

export async function toggleBundlePhoto(formData: FormData) {
  const workspace = await workspaceOrRedirect();
  const bundleId = String(formData.get("bundleId") ?? "");
  const uploadId = String(formData.get("uploadId") ?? "");
  const bundle = await prisma.bundle.findFirst({ where: { id: bundleId, workspaceId: workspace.id } });
  const upload = await prisma.upload.findFirst({ where: { id: uploadId, workspaceId: workspace.id } });
  if (!bundle || !upload || upload.kind !== "image") return;
  const existing = await prisma.bundleItem.findUnique({
    where: { bundleId_uploadId: { bundleId, uploadId } },
  });
  if (existing) {
    await prisma.bundleItem.delete({ where: { id: existing.id } });
  } else {
    const count = await prisma.bundleItem.count({ where: { bundleId } });
    await prisma.bundleItem.create({ data: { bundleId, uploadId, position: count } });
  }
  revalidatePath(`/workspace/bundles/${bundleId}`);
}

export async function toggleAudience(formData: FormData) {
  const workspace = await workspaceOrRedirect();
  const bundleId = String(formData.get("bundleId") ?? "");
  const fanId = String(formData.get("fanId") ?? "");
  const bundle = await prisma.bundle.findFirst({ where: { id: bundleId, workspaceId: workspace.id } });
  const fan = await prisma.fan.findFirst({ where: { id: fanId, workspaceId: workspace.id } });
  if (!bundle || !fan) return;
  const existing = await prisma.bundleAudience.findUnique({
    where: { bundleId_fanId: { bundleId, fanId } },
  });
  if (existing) await prisma.bundleAudience.delete({ where: { id: existing.id } });
  else await prisma.bundleAudience.create({ data: { bundleId, fanId } });
  revalidatePath(`/workspace/bundles/${bundleId}/audience`);
}

export async function importLiveHistory() {
  const workspace = await workspaceOrRedirect();
  if (workspace.mode !== "live") {
    redirect("/workspace/connection?error=demo-import");
  }
  let message = "";
  let outcome: "ready" | "incomplete" | "error" = "error";
  try {
    outcome = await runLiveImport(prisma, workspace.id);
  } catch (error) {
    message = describeImportFailure(error);
    outcome = "error";
    await prisma.importState.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        status: "error",
        historyComplete: false,
        broadcastsIncluded: false,
        gaps: [message],
        unsupported: [],
        methodNote: "The latest import failed. Earlier purchases, if any, were kept. Demo data was not substituted.",
        lastError: message,
      },
      update: {
        status: "error",
        lastError: message,
        historyComplete: false,
        broadcastsIncluded: false,
        methodNote: "The latest import failed. Earlier purchases, if any, were kept. Demo data was not substituted.",
      },
    });
  }
  revalidatePath("/workspace/connection");
  const query = outcome === "ready" ? "imported=1" : outcome === "incomplete" ? "imported=partial" : "error=import";
  redirect(`/workspace/connection?${query}`);
}

export async function requestDeletion(formData: FormData) {
  const workspace = await workspaceOrRedirect();
  const contact = String(formData.get("contact") ?? "").trim().slice(0, 200);
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 2000);
  if (!contact) return;
  await prisma.deletionRequest.create({
    data: {
      workspaceId: workspace.id,
      contact,
      detail: detail || "Creator requested deletion of Bundle Audit data.",
      status: "received",
    },
  });
  revalidatePath("/workspace/settings");
  redirect("/workspace/settings?deletion=received");
}

export async function eraseWorkspace(formData: FormData) {
  const workspace = await workspaceOrRedirect();
  if (!erasureConfirmed(formData.get("confirm"))) return;
  await prisma.deletionRequest.create({
    data: {
      workspaceId: workspace.id,
      contact: "in-app erasure",
      detail: "Creator confirmed irreversible erasure of this workspace.",
      status: "erased",
    },
  });
  await prisma.workspace.delete({ where: { id: workspace.id } });
  await clearSessionCookie();
  redirect("/?deleted=1");
}
