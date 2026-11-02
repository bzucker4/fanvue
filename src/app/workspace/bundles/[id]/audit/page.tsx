import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoFace, StatusPill } from "@/components/chrome";
import { BundleSteps, WorkspaceShell } from "@/components/workspace-shell";
import { runWorkspaceAudit } from "@/lib/audit/load";
import { prisma } from "@/lib/db";
import { STATUS_LABEL, formatMoney, formatWhen, messageTypeLabel } from "@/lib/format";
import { requireWorkspace } from "@/lib/workspace-gate";
import type { ItemAudit } from "@/lib/audit/types";

export const metadata = { title: "Audit" };

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const workspace = await requireWorkspace();
  if (!workspace) return null;
  const { id } = await params;
  const bundle = await prisma.bundle.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { items: true, audience: true },
  });
  if (!bundle) notFound();
  const uploads = await prisma.upload.findMany({ where: { workspaceId: workspace.id } });
  const byId = new Map(uploads.map((upload) => [upload.id, upload]));

  if (bundle.items.length === 0 || bundle.audience.length === 0) {
    return (
      <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/bundles">
        <div className="page-head">
          <div>
            <p className="kicker">Audit</p>
            <h1 style={{ fontSize: "2.4rem" }}>{bundle.name}</h1>
          </div>
          <BundleSteps id={bundle.id} current="audit" />
        </div>
        <div className="card empty">
          <h2>This audit needs photos and an audience</h2>
          <p>Choose at least one photo and one fan. An empty selection is not reported as “no purchase.”</p>
          <div className="actions">
            <Link className="button-secondary" href={`/workspace/bundles/${bundle.id}`}>
              Choose photos
            </Link>
            <Link className="button" href={`/workspace/bundles/${bundle.id}/audience`}>
              Choose audience
            </Link>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  const report = await runWorkspaceAudit(prisma, workspace.id, bundle.id);
  if (!report) notFound();

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/bundles">
      <div className="page-head">
        <div>
          <p className="kicker">Audit results</p>
          <h1 style={{ fontSize: "2.4rem" }}>{bundle.name}</h1>
          <p className="fine">
            Audience: {report.audience.map((fan) => fan.displayName).join(", ")}. Last synchronization{" "}
            {formatWhen(report.coverage.lastSynchronizedAt)}.
          </p>
        </div>
        <BundleSteps id={bundle.id} current="audit" />
      </div>

      <section className="stats">
        <div className="stat">
          <span className="kicker">Confirmed</span>
          <b>{report.counts.confirmed_purchase_overlap}</b>
        </div>
        <div className="stat">
          <span className="kicker">Needs review</span>
          <b>{report.counts.possible_duplicate_requiring_review}</b>
        </div>
        <div className="stat">
          <span className="kicker">No known purchase</span>
          <b>{report.counts.no_known_purchase_overlap}</b>
        </div>
        <div className="stat">
          <span className="kicker">Incomplete</span>
          <b>{report.counts.incomplete_or_unsupported_history}</b>
        </div>
      </section>

      <section className="card stack">
        <h2>Audit coverage</h2>
        <p>
          History {report.coverage.historyComplete ? "is marked complete for the imported chats" : "is incomplete"}.
          Broadcast messages are {report.coverage.broadcastsIncluded ? "included, because per-chat history was used" : "not included"}.
        </p>
        <p className="fine">
          “No known purchase overlap” only describes purchased PPV chat attachments in that history. It does not say a
          fan has never seen the photo, and a message that was merely sent does not count.
        </p>
        {report.coverage.gaps.map((gap) => (
          <p key={gap}>{gap}</p>
        ))}
        {report.coverage.unsupported.map((item) => (
          <p key={item} className="fine">
            {item}
          </p>
        ))}
      </section>

      <div className="stack">
        {report.items.map((item) => {
          const upload = byId.get(item.uploadId);
          return (
            <article key={item.uploadId} className="card audit-item">
              <PhotoFace
                src={upload?.sampleAsset}
                label={item.label}
                liveUploadId={!upload?.sampleAsset && workspace.mode === "live" ? item.uploadId : null}
              />
              <div className="stack">
                <StatusPill status={item.status} label={STATUS_LABEL[item.status] ?? item.status} />
                <h2>{item.label}</h2>
                <p>{item.summary}</p>
                <p className="mono">Media {item.mediaId}</p>
                <Evidence item={item} />
              </div>
            </article>
          );
        })}
      </div>
    </WorkspaceShell>
  );
}

function Evidence({ item }: { item: ItemAudit }) {
  return (
    <div className="stack">
      {item.purchaseEvidence.map((evidence) => (
        <div key={evidence.purchaseId} className="evidence">
          <strong>
            {evidence.fanName} purchased {messageTypeLabel(evidence.messageType).toLowerCase()}
          </strong>
          <p className="fine">
            {formatWhen(evidence.purchasedAt)} · {formatMoney(evidence.priceCents, evidence.currency)}
            {evidence.invoiceId ? ` · ${evidence.invoiceId}` : ""}
          </p>
          <p className="mono">Message {evidence.messageId}</p>
          <p>
            {evidence.matchedBecause === "same_upload"
              ? "This upload is a paid attachment on that message."
              : "A confirmed duplicate of this upload is a paid attachment on that message."}
          </p>
          <p>Paid attachments: {evidence.paidMedia.map((media) => media.label).join(", ")}</p>
          <p className="fine">
            Free preview: {evidence.preview ? `${evidence.preview.label} (${evidence.preview.mediaId})` : "None"}. Previews
            are not purchase matches.
          </p>
          {evidence.reversals.map((reversal) => (
            <p key={reversal.id}>
              A {reversal.kind.replaceAll("_", " ")} is recorded separately
              {reversal.amountCents !== null ? ` (${formatMoney(reversal.amountCents)})` : ""}. It does not remove this
              purchase evidence.
            </p>
          ))}
        </div>
      ))}
      {item.suggestionEvidence.map((suggestion) => (
        <div key={suggestion.edgeId} className="evidence">
          <strong>Suggestion only: {suggestion.suggestedLabel}</strong>
          <p className="fine">Media {suggestion.suggestedMediaId}. This link is not confirmed, so it is not a purchase overlap.</p>
          <p>
            <Link href="/workspace/library#review">Open the review queue</Link>
          </p>
          {suggestion.purchases.map((purchase) => (
            <p key={purchase.purchaseId}>
              {purchase.fanName} purchased {purchase.paidMedia.map((media) => media.label).join(", ")} on{" "}
              {formatWhen(purchase.purchasedAt)}. Message {purchase.messageId}.
            </p>
          ))}
        </div>
      ))}
      {item.unpurchasedSends.map((send) => (
        <p key={send.id} className="fine">
          A priced {messageTypeLabel(send.messageType).toLowerCase()} containing related media was sent{" "}
          {formatWhen(send.sentAt)} and has no purchase timestamp. Sent is not counted as purchased.
        </p>
      ))}
      {item.fansWithoutKnownPurchase.length > 0 && item.status === "confirmed_purchase_overlap" ? (
        <p className="fine">
          No known purchase for {item.fansWithoutKnownPurchase.map((fan) => fan.fanName).join(", ")} in the synchronized
          history.
        </p>
      ) : null}
    </div>
  );
}
