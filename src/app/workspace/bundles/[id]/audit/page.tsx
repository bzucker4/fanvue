import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@fanvue/ui";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PageIntro, PhotoFace, SecondaryLink, StatusPill, TextLink } from "@/components/chrome";
import { CopyId } from "@/components/copy-id";
import { CoverageStatus } from "@/components/coverage-status";
import { BundleSteps, WorkspaceShell } from "@/components/workspace-shell";
import { coverageForAudit } from "@/lib/live/import-failure";
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
  const visibleCoverage = coverageForAudit(workspace.importState);
  const importFailed = workspace.mode === "live" && workspace.importState?.status === "error";
  const notImported = workspace.mode === "live" && !workspace.importState?.lastSynchronizedAt;

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/bundles">
      <PageIntro kicker="Audit results" title={bundle.name} action={<BundleSteps id={bundle.id} current="audit" />}>
        <p className="typography-body-small-14px-regular text-content-secondary">
          Audience: {report.audience.map((fan) => fan.displayName).join(", ")}. Last synchronization{" "}
          {formatWhen(report.coverage.lastSynchronizedAt)}.
        </p>
      </PageIntro>

      {importFailed ? (
        <Alert variant="error" title="This is not a completed audit" action={<a href="/workspace/connection">Retry the import</a>}>
          {workspace.importState?.lastError ?? "The latest import failed."} Confirmed purchase rows below, if any, are from
          an earlier successful read. Absence of a purchase is not a finding. The sample workspace was not used.
        </Alert>
      ) : notImported ? (
        <Alert variant="warning" title="Purchase history has not been imported" action={<a href="/workspace/connection">Open connection</a>}>
          Run an import before reading this page. Nothing here is a completed audit.
        </Alert>
      ) : !visibleCoverage.historyComplete && workspace.mode === "live" ? (
        <Alert variant="warning" title="Coverage is incomplete">
          “No known purchase overlap” is withheld while history is incomplete. A missing match is not evidence of no purchase.
        </Alert>
      ) : null}

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
          <CoverageStatus
            mode={workspace.mode}
            status={workspace.importState?.status ?? null}
            historyComplete={visibleCoverage.historyComplete}
            broadcastsIncluded={visibleCoverage.broadcastsIncluded}
            chatsDiscovered={workspace.importState?.chatsDiscovered ?? 0}
            chatsImported={workspace.importState?.chatsImported ?? 0}
            messagesScanned={workspace.importState?.messagesScanned ?? 0}
            synchronizedAtLabel={
              workspace.importState?.lastSynchronizedAt
                ? formatWhen(workspace.importState.lastSynchronizedAt.toISOString())
                : null
            }
          />
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="typography-header-heading-xs">{item.label}</h2>
                  <StatusPill status={item.status} label={STATUS_LABEL[item.status] ?? item.status} />
                </div>
                <p className="typography-body-default-16px-regular">{item.summary}</p>
                <CopyId label="Media" value={item.mediaId} />
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
        <Alert variant="neutral">
          Listed price is pricing.USD.price, not the amount paid. The charged amount is not imported from this message.
        </Alert>
      ) : null}
      {item.purchaseEvidence.map((evidence) => (
        <Card key={evidence.purchaseId} hierarchy="secondary" type="container">
          <CardContent className="flex flex-col gap-1 p-3">
            <StatusPill status="confirmed_purchase_overlap" label="Purchase" />
            <p className="typography-body-default-16px-semibold">
              {evidence.fanName} purchased {messageTypeLabel(evidence.messageType).toLowerCase()}
            </p>
            <p className="typography-body-small-14px-regular">
              {formatWhen(evidence.purchasedAt)}. Listed {formatMoney(evidence.priceCents, evidence.currency)}.
            </p>
            <p className="typography-body-small-14px-regular">
              {evidence.matchedBecause === "same_upload"
                ? "This upload is a paid attachment on that message."
                : "A confirmed duplicate of this upload is a paid attachment on that message."}{" "}
              Paid attachments: {evidence.paidMedia.map((media) => media.label).join(", ") || "None recorded"}.
            </p>
            <p className="typography-body-small-14px-regular text-content-secondary">
              Free preview: {evidence.preview ? evidence.preview.label : "None"}. Previews are not purchase matches.
            </p>
            <p className="typography-body-small-14px-regular text-content-secondary">{reversalSummary(evidence.reversals)}</p>
            <TechnicalDetails title="Purchase identifiers">
              <CopyId label="Message" value={evidence.messageId} />
              {evidence.invoiceId ? <CopyId label="Invoice" value={evidence.invoiceId} /> : null}
              {evidence.paidMedia.map((media) => (
                <CopyId key={media.mediaId} label={media.label} value={media.mediaId} />
              ))}
              {evidence.preview ? <CopyId label={`${evidence.preview.label} preview`} value={evidence.preview.mediaId} /> : null}
            </TechnicalDetails>
          </CardContent>
        </Card>
      ))}
      {item.suggestionEvidence.map((suggestion) => (
        <Card key={suggestion.edgeId} hierarchy="secondary" type="container">
          <CardContent className="flex flex-col gap-1 p-3">
            <StatusPill status="possible_duplicate_requiring_review" label="Suggestion only" />
            <p className="typography-body-default-16px-semibold">{suggestion.suggestedLabel}</p>
            <p className="typography-body-small-14px-regular text-content-secondary">
              This link is not confirmed, so it is not a purchase overlap.
            </p>
            <TextLink href="/workspace/library#review">Open the review queue</TextLink>
            {suggestion.purchases.map((purchase) => (
              <p key={purchase.purchaseId} className="typography-body-small-14px-regular">
                {purchase.fanName} purchased {purchase.paidMedia.map((media) => media.label).join(", ")} on{" "}
                {formatWhen(purchase.purchasedAt)}.
              </p>
            ))}
            <TechnicalDetails title="Suggested media id">
              <CopyId label="Suggested media" value={suggestion.suggestedMediaId} />
              {suggestion.purchases.map((purchase) => (
                <CopyId key={purchase.purchaseId} label={`${purchase.fanName} message`} value={purchase.messageId} />
              ))}
            </TechnicalDetails>
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

function TechnicalDetails({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={title}>
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-2 min-[520px]:grid-cols-2">{children}</div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function reversalSummary(reversals: ItemAudit["purchaseEvidence"][number]["reversals"]) {
  if (reversals.length === 0) return "No refund or dispute on this purchase.";
  return reversals
    .map((reversal) => {
      const label = reversal.kind.replaceAll("_", " ");
      const amount = reversal.amountCents !== null ? ` for ${formatMoney(reversal.amountCents)}` : "";
      return `A ${label} is recorded separately${amount}. It does not remove this purchase evidence.`;
    })
    .join(" ");
}
