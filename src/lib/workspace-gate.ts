import { cookies } from "next/headers";
import { readSessionToken } from "./crypto/session";
import { prisma } from "./db";
import { readFanvueConfig } from "./fanvue/config";
import { SESSION_COOKIE } from "./session-cookie";

async function loadSession() {
  const config = readFanvueConfig();
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw || !config.sessionSecret) return { kind: "anonymous" as const };
  const sessionId = readSessionToken(raw, config.sessionSecret)?.id ?? null;
  if (!sessionId) return { kind: "expired" as const };
  const session = await prisma.appSession.findUnique({
    where: { id: sessionId },
    include: { workspace: { include: { importState: true, token: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return { kind: "expired" as const };
  return { kind: "ready" as const, workspace: session.workspace };
}

export async function workspaceGate() {
  return loadSession();
}

export async function currentWorkspace() {
  const gate = await loadSession();
  return gate.kind === "ready" ? gate.workspace : null;
}

export async function requireWorkspace() {
  return currentWorkspace();
}
