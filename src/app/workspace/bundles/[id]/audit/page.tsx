import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ProgressBar,
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableMobileRow,
  TableRow,
  TableScrollArea,
} from "@fanvue/ui";
import { notFound } from "next/navigation";
import { PageIntro, PhotoFace, SecondaryLink, StatusPill, TextLink } from "@/components/chrome";
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
        <PageIntro kicker="Audit" title={bundle.name} action={<BundleSteps id={bundle.id} current="audit" />} />
        <EmptyState
          variant="centered"
          titleSize="sm"
          mediaSize="xs"
          title="This audit needs photos and an audience"
          description="Choose at least one photo and one fan. An empty selection is not reported as “no purchase.”"
          primaryAction={<SecondaryLink href={`/workspace/bundles/${bundle.id}/audience`}>Choose audience</SecondaryLink>}
          secondaryAction={<SecondaryLink href={`/workspace/bundles/${bundle.id}`}>Choose photos</SecondaryLink>}
        />
      </WorkspaceShell>
    );
  }

  const report = await runWorkspaceAudit(prisma, workspace.id, bundle.id);
  if (!report) notFound();

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/bundles">
      <PageIntro kicker="Audit results" title={bundle.name} action={<BundleSteps id={bundle.id} current="audit" />}>
        <p className="typography-body-small-14px-regular text-content-secondary">
          Audience: {report.audience.map((fan) => fan.displayName).join(", ")}. Last synchronization{" "}
          {formatWhen(report.coverage.lastSynchronizedAt)}.
        </p>
      </PageIntro>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Result counts">
        <CountCard label="Confirmed" value={report.counts.confirmed_purchase_overlap} status="confirmed_purchase_overlap" />
        <CountCard label="Needs review" value={report.counts.possible_duplicate_requiring_review} status="possible_duplicate_requiring_review" />
        <CountCard label="No known purchase" value={report.counts.no_known_purchase_overlap} status="no_known_purchase_overlap" />
        <CountCard label="Incomplete" value={report.counts.incomplete_or_unsupported_history} status="incomplete_or_unsupported_history" />
      </section>

      <Card hierarchy="primary" type="header-only">
        <CardHeader>
          <CardTitle>Audit coverage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ProgressBar
            variant="mono"
            value={report.coverage.historyComplete ? 100 : 0}
            title="History"
            showCompletion
            helperLeft={
              report.coverage.historyComplete
                ? "Marked complete for the imported chats"
                : "Incomplete"
            }
            helperRight={report.coverage.broadcastsIncluded ? "Broadcasts included" : "Broadcasts not included"}
            ariaLabel="Audit history coverage"
            ariaValueText={
              report.coverage.historyComplete
                ? "History is marked complete for the imported chats"
                : "History is incomplete"
            }
          />
          <p className="typography-body-default-16px-regular">
            History {report.coverage.historyComplete ? "is marked complete for the imported chats" : "is incomplete"}.
            Broadcast messages are {report.coverage.broadcastsIncluded ? "included, because per-chat history was used" : "not included"}.
          </p>
          {workspace.importState?.billingMode === "validation" ? (
            <Alert variant="success">
              This audit uses a validation import. It is not covered by an active Fanvue plan, and it is not the sample
              workspace.
            </Alert>
          ) : null}
          <p className="typography-body-small-14px-regular text-content-secondary">
            “No known purchase overlap” only describes purchased PPV chat attachments in that history. It does not say a
            fan has never seen the photo, and a message that was merely sent does not count.
          </p>
          {report.coverage.gaps.map((gap) => (
            <Alert key={gap} variant="warning">{gap}</Alert>
          ))}
          {report.coverage.unsupported.map((item) => (
            <p key={item} className="typography-body-small-14px-regular text-content-secondary">{item}</p>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {report.items.map((item) => {
          const upload = byId.get(item.uploadId);
          return (
            <article key={item.uploadId} className="grid gap-4 rounded-md border border-border-primary bg-surface-primary p-4 md:grid-cols-[160px_1fr]">
              <PhotoFace
                src={upload?.sampleAsset}
                label={item.label}
                liveUploadId={!upload?.sampleAsset && workspace.mode === "live" ? item.uploadId : null}
              />
              <div className="flex min-w-0 flex-col gap-2">
                <StatusPill status={item.status} label={STATUS_LABEL[item.status] ?? item.status} />
                <h2 className="typography-header-heading-xs">{item.label}</h2>
                <p className="typography-body-default-16px-regular">{item.summary}</p>
                <p className="font-mono text-xs break-all text-content-tertiary">Media {item.mediaId}</p>
                <Evidence item={item} />
              </div>
            </article>
          );
        })}
      </div>
    </WorkspaceShell>
  );
}

function CountCard({ label, value, status }: { label: string; value: number; status: string }) {
  return (
    <Card hierarchy="secondary" type="container">
      <CardContent className="flex flex-col gap-2 p-4">
        <StatusPill status={status} label={label} />
        <p className="typography-header-heading-sm">{value}</p>
      </CardContent>
    </Card>
  );
}

function Evidence({ item }: { item: ItemAudit }) {
  return (
    <div className="flex flex-col gap-3">
      {item.purchaseEvidence.length > 0 ? (
        <>
          <Alert variant="neutral">
            Listed price is pricing.USD.price, not the amount paid. The charged amount is not imported from this message.
          </Alert>
          <div className="flex flex-col gap-3 sm:hidden">
            {item.purchaseEvidence.map((evidence) => (
              <TableMobileRow
                key={evidence.purchaseId}
                wrap
                badge={<StatusPill status="confirmed_purchase_overlap" label="Purchase" />}
                title={`${evidence.fanName} purchased ${messageTypeLabel(evidence.messageType).toLowerCase()}`}
                description={purchaseDescription(evidence)}
              />
            ))}
          </div>
          <TableCard className="hidden sm:block">
            <TableScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fan</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Listed price</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Reversal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.purchaseEvidence.map((evidence) => (
                    <TableRow key={evidence.purchaseId}>
                      <TableCell>{evidence.fanName}</TableCell>
                      <TableCell>{formatWhen(evidence.purchasedAt)}</TableCell>
                      <TableCell>
                        Listed {formatMoney(evidence.priceCents, evidence.currency)}
                        {evidence.invoiceId ? ` · ${evidence.invoiceId}` : ""}
                      </TableCell>
                      <TableCell>
                        {messageTypeLabel(evidence.messageType)}
                        <span className="mt-1 block font-mono text-xs break-all text-content-tertiary">{evidence.messageId}</span>
                      </TableCell>
                      <TableCell>
                        {evidence.matchedBecause === "same_upload"
                          ? "This upload is a paid attachment on that message."
                          : "A confirmed duplicate of this upload is a paid attachment on that message."}{" "}
                        Paid attachments: {evidence.paidMedia.map((media) => media.label).join(", ")}
                      </TableCell>
                      <TableCell>
                        {evidence.preview ? `${evidence.preview.label} (${evidence.preview.mediaId})` : "None"}. Previews are
                        not purchase matches.
                      </TableCell>
                      <TableCell>
                        {evidence.reversals.length === 0
                          ? "None"
                          : evidence.reversals
                              .map(
                                (reversal) =>
                                  `A ${reversal.kind.replaceAll("_", " ")} is recorded separately${
                                    reversal.amountCents !== null ? ` (${formatMoney(reversal.amountCents)})` : ""
                                  }. It does not remove this purchase evidence.`,
                              )
                              .join(" ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScrollArea>
          </TableCard>
        </>
      ) : null}
      {item.suggestionEvidence.map((suggestion) => (
        <Card key={suggestion.edgeId} hierarchy="secondary" type="container">
          <CardContent className="flex flex-col gap-2 p-4">
            <StatusPill status="possible_duplicate_requiring_review" label={`Suggestion only: ${suggestion.suggestedLabel}`} />
            <p className="typography-body-small-14px-regular text-content-secondary">
              Media {suggestion.suggestedMediaId}. This link is not confirmed, so it is not a purchase overlap.
            </p>
            <TextLink href="/workspace/library#review">Open the review queue</TextLink>
            {suggestion.purchases.map((purchase) => (
              <p key={purchase.purchaseId} className="typography-body-small-14px-regular">
                {purchase.fanName} purchased {purchase.paidMedia.map((media) => media.label).join(", ")} on{" "}
                {formatWhen(purchase.purchasedAt)}. Message {purchase.messageId}.
              </p>
            ))}
          </CardContent>
        </Card>
      ))}
      {item.unpurchasedSends.map((send) => (
        <p key={send.id} className="typography-body-small-14px-regular text-content-secondary">
          A priced {messageTypeLabel(send.messageType).toLowerCase()} containing related media was sent{" "}
          {formatWhen(send.sentAt)} and has no purchase timestamp. Sent is not counted as purchased.
        </p>
      ))}
      {item.fansWithoutKnownPurchase.length > 0 && item.status === "confirmed_purchase_overlap" ? (
        <p className="typography-body-small-14px-regular text-content-secondary">
          No known purchase for {item.fansWithoutKnownPurchase.map((fan) => fan.fanName).join(", ")} in the synchronized
          history.
        </p>
      ) : null}
    </div>
  );
}

function purchaseDescription(evidence: ItemAudit["purchaseEvidence"][number]) {
  return [
    `${formatWhen(evidence.purchasedAt)} · Listed ${formatMoney(evidence.priceCents, evidence.currency)}${evidence.invoiceId ? ` · ${evidence.invoiceId}` : ""}`,
    `Message ${evidence.messageId}`,
    evidence.matchedBecause === "same_upload"
      ? "This upload is a paid attachment on that message."
      : "A confirmed duplicate of this upload is a paid attachment on that message.",
    `Paid attachments: ${evidence.paidMedia.map((media) => media.label).join(", ")}`,
    `Free preview: ${evidence.preview ? `${evidence.preview.label} (${evidence.preview.mediaId})` : "None"}. Previews are not purchase matches.`,
    evidence.reversals.length === 0
      ? ""
      : evidence.reversals
          .map(
            (reversal) =>
              `A ${reversal.kind.replaceAll("_", " ")} is recorded separately${
                reversal.amountCents !== null ? ` (${formatMoney(reversal.amountCents)})` : ""
              }. It does not remove this purchase evidence.`,
          )
          .join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}
