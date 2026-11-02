import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FanvueApiError } from "@/lib/fanvue/client";
import { authorizedClient } from "@/lib/live/tokens";
import { requireWorkspace } from "@/lib/workspace-gate";

/**
 * Resolves a short-lived thumbnail for the current view.
 * The URL is not written to the database and the file is not stored for fingerprinting.
 */
export async function GET(request: Request) {
  const workspace = await requireWorkspace();
  const uploadId = new URL(request.url).searchParams.get("uploadId");
  if (!workspace || !uploadId) {
    return NextResponse.json({ message: "Preview unavailable" }, { status: 404 });
  }
  const upload = await prisma.upload.findFirst({ where: { id: uploadId, workspaceId: workspace.id } });
  if (!upload) return NextResponse.json({ message: "Preview unavailable" }, { status: 404 });
  if (workspace.mode !== "live") {
    return NextResponse.json({ message: upload.sampleAsset ? "Use the sample asset." : "Preview unavailable" });
  }
  if (upload.sampleAsset) {
    return NextResponse.json({ message: "Live previews do not use sample photos." }, { status: 409 });
  }
  try {
    const { client } = await authorizedClient(prisma, workspace.id);
    const body = await client.getJson<{
      results?: Record<string, { variants?: Array<{ variantType?: string; url?: string }> } | null>;
    }>(`/media/bulk?mediaUuids=${encodeURIComponent(upload.mediaId)}&variants=thumbnail`);
    const variants = body.results?.[upload.mediaId]?.variants ?? [];
    const url = variants.find((variant) => variant.variantType === "thumbnail")?.url ?? variants[0]?.url;
    if (!url) return NextResponse.json({ message: "No thumbnail is available yet." });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof FanvueApiError && error.ageVerificationUrl) {
      return NextResponse.json({
        message: "Age verification is required before Fanvue will show this media.",
        ageVerificationUrl: error.ageVerificationUrl,
      });
    }
    return NextResponse.json({ message: "Preview unavailable" });
  }
}
