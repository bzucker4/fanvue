import { notFound } from "next/navigation";
import { PhotoFace } from "@/components/chrome";
import { BundleSteps, WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace-gate";
import { toggleBundlePhoto } from "../../actions";

export const metadata = { title: "Bundle photos" };

export default async function BundleBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const workspace = await requireWorkspace();
  if (!workspace) return null;
  const { id } = await params;
  const bundle = await prisma.bundle.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { items: true },
  });
  if (!bundle) notFound();
  const uploads = await prisma.upload.findMany({ where: { workspaceId: workspace.id }, orderBy: { label: "asc" } });
  const selected = new Set(bundle.items.map((item) => item.uploadId));

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/bundles">
      <div className="page-head">
        <div>
          <p className="kicker">Bundle builder</p>
          <h1 style={{ fontSize: "2.4rem" }}>{bundle.name}</h1>
        </div>
        <BundleSteps id={bundle.id} current="photos" />
      </div>
      <p className="fine">Only photos can be added. Video and other files stay visible so they are not silently dropped.</p>
      {uploads.length === 0 ? (
        <div className="card empty">
          <h3>The library is empty</h3>
          <p className="fine">Import purchase history before building a live bundle.</p>
        </div>
      ) : (
        <div className="photo-grid">
          {uploads.map((upload) => {
            const on = selected.has(upload.id);
            const image = upload.kind === "image";
            return (
              <article key={upload.id} className="photo-card" style={{ outline: on ? "2px solid var(--accent)" : undefined }}>
                <PhotoFace src={upload.sampleAsset} label={upload.label} liveUploadId={!upload.sampleAsset && workspace.mode === "live" ? upload.id : null} />
                <div className="meta">
                  <h3>{upload.label}</h3>
                  <p className="mono">{upload.mediaId}</p>
                  {image ? (
                    <form action={toggleBundlePhoto}>
                      <input type="hidden" name="bundleId" value={bundle.id} />
                      <input type="hidden" name="uploadId" value={upload.id} />
                      <button className={on ? "button" : "button-secondary"} type="submit">
                        {on ? "Remove from bundle" : "Add to bundle"}
                      </button>
                    </form>
                  ) : (
                    <span className="pill incomplete">Not a photo</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}
