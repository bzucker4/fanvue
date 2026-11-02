import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purgeExpiredOauthAttempts } from "@/lib/live/purge-oauth-attempts";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Without a
// configured secret the route refuses every request.
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const purged = await purgeExpiredOauthAttempts(prisma);
  return NextResponse.json({ purged });
}
