import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@fanvue/ui";
import { PageIntro, PhotoFace, StatusPill } from "@/components/chrome";
import { CopyId } from "@/components/copy-id";
import { DuplicateUploadFields } from "@/components/duplicate-upload-fields";
import { SubmitButton } from "@/components/submit-button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace-gate";
import { setDuplicateStatus } from "../actions";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const workspace = await requireWorkspace();
  if (!workspace) return null;
  const uploads = await prisma.upload.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { label: "asc" },
  });
  const edges = await prisma.duplicateEdge.findMany({ where: { workspaceId: workspace.id } });
  const photos = uploads.filter((upload) => upload.kind === "image");
  const suggestions = edges.filter((edge) => edge.status === "suggested");
  const confirmed = edges.filter((edge) => edge.status === "confirmed");
  const closed = edges.filter((edge) => edge.status === "rejected" || edge.status === "reversed");
  const byId = new Map(uploads.map((upload) => [upload.id, upload]));

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/library">
      <PageIntro kicker="Media library" title="Photos and duplicate review">
        <p className="typography-body-small-14px-regular text-content-secondary">
          Each card is one upload, identified by its Fanvue media ID. Confirming a pair does not pull in other suggestions.
        </p>
      </PageIntro>

      <section className="flex flex-col gap-3" id="review">
        <h2 className="typography-header-heading-xs">Review queue</h2>
        {suggestions.length === 0 ? (
          <EmptyState
            variant="centered"
            titleSize="sm"
            mediaSize="xs"
            title="No suggestions waiting"
            description="Approximate matches stay here until you confirm or reject them. Nothing is merged automatically."
          />
        ) : (
          suggestions.map((edge) => {
            const left = byId.get(edge.leftUploadId);
            const right = byId.get(edge.rightUploadId);
            if (!left || !right) return null;
            return (
              <article key={edge.id} className="grid gap-4 rounded-md border border-border-primary bg-surface-primary p-3 md:grid-cols-[96px_96px_1fr] md:items-center">
                <PhotoFace className="h-28 w-24 rounded-xs bg-surface-secondary object-cover" src={left.sampleAsset} label={left.label} liveUploadId={workspace.mode === "live" ? left.id : null} />
                <PhotoFace className="h-28 w-24 rounded-xs bg-surface-secondary object-cover" src={right.sampleAsset} label={right.label} liveUploadId={workspace.mode === "live" ? right.id : null} />
                <div className="flex flex-col gap-2">
                  <StatusPill status="possible_duplicate_requiring_review" label="Possible duplicate requiring review" />
                  <strong className="typography-body-default-16px-semibold">
                    {left.label} and {right.label}
                  </strong>
                  <p className="typography-body-small-14px-regular text-content-secondary">
                    {edge.note ?? "Suggested only. This is not a confirmed content identity."}
                  </p>
                  <CopyId label={left.label} value={left.mediaId} />
                  <CopyId label={right.label} value={right.mediaId} />
                  <div className="flex flex-wrap gap-2">
                    <form action={setDuplicateStatus}>
                      <input type="hidden" name="left" value={left.id} />
                      <input type="hidden" name="right" value={right.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <SubmitButton variant="primary" size="32">
                        Confirm same photo
                      </SubmitButton>
                    </form>
                    <form action={setDuplicateStatus}>
                      <input type="hidden" name="left" value={left.id} />
                      <input type="hidden" name="right" value={right.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <SubmitButton variant="tertiary" size="32">
                        Not the same
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      <Card hierarchy="primary" type="header-only">
        <CardHeader>
          <CardTitle>Link two uploads yourself</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="typography-body-small-14px-regular text-content-secondary">Import photo uploads before confirming a pair.</p>
          ) : (
            <form action={setDuplicateStatus} className="flex flex-col gap-3">
              <DuplicateUploadFields photos={photos.map((photo) => ({ id: photo.id, label: photo.label }))} />
              <input type="hidden" name="status" value="confirmed" />
              <SubmitButton variant="secondary" size="40">
                Confirm these are the same photo
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>

      {confirmed.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="typography-header-heading-xs">Confirmed same photo</h2>
          {confirmed.map((edge) => (
            <EdgeRow key={edge.id} edge={edge} byId={byId} action="reversed" actionLabel="Reverse confirmation" />
          ))}
        </section>
      ) : null}

      {closed.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="typography-header-heading-xs">Rejected or reversed</h2>
          {closed.map((edge) => (
            <EdgeRow key={edge.id} edge={edge} byId={byId} action="confirmed" actionLabel="Confirm again" />
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="typography-header-heading-xs">All uploads</h2>
        {uploads.length === 0 ? (
          <EmptyState
            variant="centered"
            titleSize="sm"
            mediaSize="xs"
            title="No media yet"
            description="A live import adds media IDs from purchased attachments and from ready vault metadata. Thumbnails are requested when you open this page and are not saved."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3">
            {uploads.map((upload) => (
              <article key={upload.id} className="flex flex-col overflow-hidden rounded-md border border-border-primary bg-surface-primary">
                <PhotoFace
                  src={upload.sampleAsset}
                  label={upload.label}
                  liveUploadId={!upload.sampleAsset && workspace.mode === "live" ? upload.id : null}
                />
                <div className="flex flex-col gap-1 p-3">
                  <span className="typography-description-12px-semibold text-content-secondary uppercase">
                    {upload.kind === "image" ? "Photo upload" : upload.kind}
                  </span>
                  <h3 className="typography-body-default-16px-semibold">{upload.label}</h3>
                  <CopyId label="Media" value={upload.mediaId} />
                  {upload.kind !== "image" ? <StatusPill status="incomplete_or_unsupported_history" label="Outside photo audit" /> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}

function EdgeRow({
  edge,
  byId,
  action,
  actionLabel,
}: {
  edge: { leftUploadId: string; rightUploadId: string; status: string };
  byId: Map<string, { id: string; label: string }>;
  action: string;
  actionLabel: string;
}) {
  const left = byId.get(edge.leftUploadId);
  const right = byId.get(edge.rightUploadId);
  if (!left || !right) return null;
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-primary bg-surface-primary p-3">
      <div className="flex flex-col gap-2">
        <strong className="typography-body-default-16px-semibold">
          {left.label} · {right.label}
        </strong>
        <Badge variant={edge.status === "confirmed" ? "brand" : "default"} leftDot={false}>
          {edge.status === "confirmed" ? "Confirmed link" : edge.status === "reversed" ? "Reversed" : "Rejected"}
        </Badge>
      </div>
      <form action={setDuplicateStatus}>
        <input type="hidden" name="left" value={left.id} />
        <input type="hidden" name="right" value={right.id} />
        <input type="hidden" name="status" value={action} />
        <SubmitButton variant="tertiary" size="32">
          {actionLabel}
        </SubmitButton>
      </form>
    </article>
  );
}
