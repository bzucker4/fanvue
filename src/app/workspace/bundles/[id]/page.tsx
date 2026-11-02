import { EmptyState } from "@fanvue/ui";
import { notFound } from "next/navigation";
import { PageIntro, PhotoFace, StatusPill } from "@/components/chrome";
import { CopyId } from "@/components/copy-id";
import { SubmitButton } from "@/components/submit-button";
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
      <PageIntro kicker="Bundle builder" title={bundle.name} action={<BundleSteps id={bundle.id} current="photos" />} />
      <p className="typography-body-small-14px-regular text-content-secondary">
        Only photos can be added. Video and other files stay visible so they are not silently dropped.
      </p>
      {uploads.length === 0 ? (
        <EmptyState
          variant="centered"
          titleSize="sm"
          mediaSize="xs"
          title="The library is empty"
          description="Import purchase history before building a live bundle."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3">
          {uploads.map((upload) => {
            const on = selected.has(upload.id);
            const image = upload.kind === "image";
            return (
              <article
                key={upload.id}
                className={`flex flex-col overflow-hidden rounded-md border bg-surface-primary ${on ? "border-brand-primary-default ring-2 ring-brand-primary-default" : "border-border-primary"}`}
              >
                <PhotoFace
                  className="aspect-[4/3] w-full rounded-sm bg-surface-secondary object-cover"
                  src={upload.sampleAsset}
                  label={upload.label}
                  liveUploadId={!upload.sampleAsset && workspace.mode === "live" ? upload.id : null}
                />
                <div className="flex flex-col gap-2 p-3">
                  <h2 className="typography-body-default-16px-semibold">{upload.label}</h2>
                  <CopyId label="Media" value={upload.mediaId} />
                  {image ? (
                    <form action={toggleBundlePhoto}>
                      <input type="hidden" name="bundleId" value={bundle.id} />
                      <input type="hidden" name="uploadId" value={upload.id} />
                      <SubmitButton variant={on ? "primary" : "secondary"} size="32">
                        {on ? "Remove from bundle" : "Add to bundle"}
                      </SubmitButton>
                    </form>
                  ) : (
                    <StatusPill status="incomplete_or_unsupported_history" label="Not a photo" />
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
