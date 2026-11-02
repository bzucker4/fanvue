import { PhotoFace, StatusPill } from "@/components/chrome";
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
      <div className="page-head">
        <div>
          <p className="kicker">Media library</p>
          <h1 style={{ fontSize: "2.4rem" }}>Photos and duplicate review</h1>
          <p className="fine">Each card is one upload, identified by its Fanvue media ID. Confirming a pair does not pull in other suggestions.</p>
        </div>
      </div>

      <section className="stack" id="review">
        <h2>Review queue</h2>
        {suggestions.length === 0 ? (
          <div className="card empty">
            <h3>No suggestions waiting</h3>
            <p className="fine">Approximate matches stay here until you confirm or reject them. Nothing is merged automatically.</p>
          </div>
        ) : (
          suggestions.map((edge) => {
            const left = byId.get(edge.leftUploadId);
            const right = byId.get(edge.rightUploadId);
            if (!left || !right) return null;
            return (
              <article key={edge.id} className="queue">
                <PhotoFace src={left.sampleAsset} label={left.label} liveUploadId={workspace.mode === "live" ? left.id : null} />
                <PhotoFace src={right.sampleAsset} label={right.label} liveUploadId={workspace.mode === "live" ? right.id : null} />
                <div className="stack">
                  <StatusPill status="possible_duplicate_requiring_review" label="Possible duplicate requiring review" />
                  <strong>
                    {left.label} and {right.label}
                  </strong>
                  <p className="fine">{edge.note ?? "Suggested only. This is not a confirmed content identity."}</p>
                  <p className="mono">
                    {left.mediaId}
                    <br />
                    {right.mediaId}
                  </p>
                  <div className="row-actions">
                    <form action={setDuplicateStatus}>
                      <input type="hidden" name="left" value={left.id} />
                      <input type="hidden" name="right" value={right.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <button className="button" type="submit">
                        Confirm same photo
                      </button>
                    </form>
                    <form action={setDuplicateStatus}>
                      <input type="hidden" name="left" value={left.id} />
                      <input type="hidden" name="right" value={right.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button className="button-quiet" type="submit">
                        Not the same
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="card stack">
        <h2>Link two uploads yourself</h2>
        <form action={setDuplicateStatus} className="stack">
          <div className="grid-2">
            <label className="field">
              First upload
              <select name="left" required>
                {photos.map((photo) => (
                  <option key={photo.id} value={photo.id}>
                    {photo.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Second upload
              <select name="right" required defaultValue={photos[1]?.id ?? ""}>
                {photos.map((photo) => (
                  <option key={photo.id} value={photo.id}>
                    {photo.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input type="hidden" name="status" value="confirmed" />
          <button className="button-secondary" type="submit">
            Confirm these are the same photo
          </button>
        </form>
      </section>

      {confirmed.length > 0 ? (
        <section className="stack">
          <h2>Confirmed same photo</h2>
          {confirmed.map((edge) => (
            <EdgeRow key={edge.id} edge={edge} byId={byId} action="reversed" actionLabel="Reverse confirmation" />
          ))}
        </section>
      ) : null}

      {closed.length > 0 ? (
        <section className="stack">
          <h2>Rejected or reversed</h2>
          {closed.map((edge) => (
            <EdgeRow key={edge.id} edge={edge} byId={byId} action="confirmed" actionLabel="Confirm again" />
          ))}
        </section>
      ) : null}

      <section className="stack">
        <h2>All uploads</h2>
        <div className="photo-grid">
          {uploads.map((upload) => (
            <article key={upload.id} className="photo-card">
              <PhotoFace
                src={upload.sampleAsset}
                label={upload.label}
                liveUploadId={!upload.sampleAsset && workspace.mode === "live" ? upload.id : null}
              />
              <div className="meta">
                <span className="kicker">{upload.kind === "image" ? "Photo upload" : upload.kind}</span>
                <h3>{upload.label}</h3>
                <p className="mono">{upload.mediaId}</p>
                {upload.kind !== "image" ? <span className="pill incomplete">Outside photo audit</span> : null}
              </div>
            </article>
          ))}
        </div>
        {uploads.length === 0 ? (
          <div className="card empty">
            <h3>No media yet</h3>
            <p className="fine">A live import adds media IDs from purchased attachments and from ready vault metadata. Thumbnails are requested when you open this page and are not saved.</p>
          </div>
        ) : null}
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
    <article className="ledger-row">
      <div className="split">
        <strong>
          {left.label} · {right.label}
        </strong>
        <span className="pill neutral">{edge.status}</span>
      </div>
      <form action={setDuplicateStatus}>
        <input type="hidden" name="left" value={left.id} />
        <input type="hidden" name="right" value={right.id} />
        <input type="hidden" name="status" value={action} />
        <button className="button-quiet" type="submit">
          {actionLabel}
        </button>
      </form>
    </article>
  );
}
