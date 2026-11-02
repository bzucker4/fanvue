import { prisma } from "./db";
import { readSessionId } from "./session-cookie";

export async function currentWorkspace() {
  const sessionId = await readSessionId();
  if (!sessionId) return null;
  const session = await prisma.appSession.findUnique({
    where: { id: sessionId },
    include: { workspace: { include: { importState: true, token: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.workspace;
}

export async function requireWorkspace() {
  const workspace = await currentWorkspace();
  if (!workspace) return null;
  return workspace;
}
