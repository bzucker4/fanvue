import { prisma } from "@/lib/db";
import { handleFanvueWebhook } from "@/lib/fanvue/receive-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleFanvueWebhook(prisma, request);
}
