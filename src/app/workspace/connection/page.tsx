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
import { PageIntro, PrimaryLink, TextLink } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@/lib/db";
import { formatMoney, formatWhen, messageTypeLabel } from "@/lib/format";
import { readFanvueConfig, validationBypassForCreator } from "@/lib/fanvue/config";
import { validationBlockMessage } from "@/lib/live/import-gate";
import { purchaseListState } from "@/lib/live/import-failure";
import { readEntitlement } from "@/lib/fanvue/entitlement";
import { authorizedClient } from "@/lib/live/tokens";
import { requireWorkspace } from "@/lib/workspace-gate";
import { importLiveHistory } from "../actions";

export const metadata = { title: "Connection" };

export default async function ConnectionPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; error?: string }>;
}) {
  const workspace = await requireWorkspace();
  if (!workspace) return null;
  const params = await searchParams;
  const state = workspace.importState;
  const purchases = await prisma.purchase.findMany({
    where: { workspaceId: workspace.id },
    include: { fan: true, attachments: { include: { upload: true } }, reversals: true },
    orderBy: { purchasedAt: "desc" },
  });
  const bypass =
    workspace.mode === "live"
      ? validationBypassForCreator(process.env, workspace.fanvueUserUuid)
      : { allowed: false as const, reason: "disabled" as const };
  const entitlement = workspace.mode === "live" ? await loadEntitlement(workspace.id, workspace.fanvueUserUuid) : null;
  const canImport = entitlement?.state === "active" || bypass.allowed;
  const gaps = asStrings(state?.gaps);
  const unsupported = asStrings(state?.unsupported);

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/connection">
      <PageIntro
        kicker="Connection and import"
        title={workspace.displayName}
        action={
          workspace.mode === "live" ? (
            <form action={importLiveHistory}>
              <SubmitButton variant="primary" size="40" disabled={!canImport}>
                {state?.lastSynchronizedAt ? "Reconcile missed updates" : "Import purchase history"}
              </SubmitButton>
            </form>
          ) : (
            <PrimaryLink href="/workspace/library">Review the sample photos</PrimaryLink>
          )
        }
      >
        <p className="typography-body-small-14px-regular text-content-secondary">
          {workspace.handle ? `@${workspace.handle}` : "No public handle"}
        </p>
        {workspace.mode === "live" && workspace.fanvueUserUuid ? (
          <p className="font-mono text-xs break-all text-content-tertiary">Fanvue user id {workspace.fanvueUserUuid}</p>
        ) : null}
      </PageIntro>

      {params.imported === "1" && state?.status === "ready" ? (
        <Alert variant="success">Import finished. Coverage below is for that synchronization.</Alert>
      ) : null}
      {state?.status === "incomplete" ? (
        <Alert variant="warning" title="Import is incomplete" action={<a href="/support">Contact support</a>}>
          At least one chat was not fully read. Missing purchases are not treated as “no purchase.” Try the import again,
          or reconnect if Fanvue refused access.
        </Alert>
      ) : null}
      {state?.status === "error" && state.lastError ? (
        <Alert variant="error" title="Import failed" action={recoveryLink(state.lastError)}>
          {state.lastError} This is not an empty purchase history and it is not a completed audit.
        </Alert>
      ) : null}
      {params.error === "demo-import" ? (
        <Alert variant="error">Demo mode does not call Fanvue and cannot run a live import.</Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Import coverage">
        <ProgressBar
          variant="mono"
          value={state?.historyComplete ? 100 : 0}
          title="Chat history"
          showCompletion
          helperLeft={state?.historyComplete ? "Complete" : "Incomplete"}
          ariaLabel="Chat history coverage"
          ariaValueText={state?.historyComplete ? "Complete" : "Incomplete"}
        />
        <ProgressBar
          variant="mono"
          value={state?.broadcastsIncluded ? 100 : 0}
          title="Broadcasts"
          showCompletion
          helperLeft={state?.broadcastsIncluded ? "Included" : "Not included"}
          ariaLabel="Broadcast coverage"
          ariaValueText={state?.broadcastsIncluded ? "Included" : "Not included"}
        />
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card hierarchy="secondary" type="container">
          <CardContent className="flex flex-col gap-1 p-4">
            <p className="typography-description-12px-semibold text-content-secondary uppercase">Last successful synchronization</p>
            <p className="typography-body-default-16px-semibold">{formatWhen(state?.lastSynchronizedAt?.toISOString() ?? null)}</p>
          </CardContent>
        </Card>
        <Card hierarchy="secondary" type="container">
          <CardContent className="flex flex-col gap-1 p-4">
            <p className="typography-description-12px-semibold text-content-secondary uppercase">Purchases stored</p>
            <p className="typography-header-heading-xs">{purchases.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card hierarchy="primary" type="header-only">
        <CardHeader>
          <CardTitle>How this history was read</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="typography-body-default-16px-regular">{state?.methodNote ?? "No import has run."}</p>
          <p className="typography-body-small-14px-regular text-content-secondary">
            Chats discovered {state?.chatsDiscovered ?? 0}, chats imported {state?.chatsImported ?? 0}, messages scanned{" "}
            {state?.messagesScanned ?? 0}. Unread state is preserved on live imports by sending markAsRead=false.
          </p>
          {workspace.importState?.billingMode === "validation" ? (
            <Alert variant="success">
              The last import was a validation read. It is not an active Fanvue plan, and it did not use sample purchases.
            </Alert>
          ) : null}
          {entitlement ? <EntitlementNote entitlement={entitlement} bypass={bypass} /> : null}
        </CardContent>
      </Card>

      {gaps.length > 0 ? (
        <Card hierarchy="primary" type="header-only">
          <CardHeader>
            <CardTitle>Gaps</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {gaps.map((gap) => (
              <p key={gap} className="typography-body-default-16px-regular">{gap}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {unsupported.length > 0 ? (
        <Card hierarchy="primary" type="header-only">
          <CardHeader>
            <CardTitle>Outside this audit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {unsupported.map((item) => (
              <p key={item} className="typography-body-default-16px-regular">{item}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="typography-header-heading-xs">Purchase evidence</h2>
        <Alert variant="neutral">
          Listed price is the message’s pricing.USD.price. The amount the fan paid can differ after a discount and is
          not on this record.
        </Alert>
        {purchases.length === 0 ? (
          <PurchaseEmpty mode={workspace.mode} state={state} />
        ) : (
          <PurchaseTable purchases={purchases} />
        )}
      </section>
    </WorkspaceShell>
  );
}

function PurchaseTable({
  purchases,
}: {
  purchases: {
    id: string;
    messageType: string;
    priceCents: number | null;
    currency: string;
    purchasedAt: Date;
    invoiceId: string | null;
    messageId: string;
    fan: { displayName: string };
    attachments: { role: string; upload: { label: string } }[];
    reversals: { id: string; kind: string; amountCents: number | null }[];
  }[];
}) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden">
        {purchases.map((purchase) => {
          const detail = purchaseDetail(purchase);
          return (
            <TableMobileRow
              key={purchase.id}
              wrap
              title={`${purchase.fan.displayName} · ${messageTypeLabel(purchase.messageType)}`}
              description={detail}
            />
          );
        })}
      </div>
      <TableCard className="hidden sm:block">
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fan</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Listed price</TableHead>
                <TableHead>Purchased</TableHead>
                <TableHead>Paid attachments</TableHead>
                <TableHead>Free preview</TableHead>
                <TableHead>Reversals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => {
                const paid = purchase.attachments.filter((item) => item.role === "paid");
                const preview = purchase.attachments.find((item) => item.role === "preview");
                return (
                  <TableRow key={purchase.id}>
                    <TableCell>{purchase.fan.displayName}</TableCell>
                    <TableCell>
                      {messageTypeLabel(purchase.messageType)}
                      <span className="mt-1 block font-mono text-xs break-all text-content-tertiary">{purchase.messageId}</span>
                    </TableCell>
                    <TableCell>Listed {formatMoney(purchase.priceCents, purchase.currency)}</TableCell>
                    <TableCell>
                      {formatWhen(purchase.purchasedAt.toISOString())}
                      {purchase.invoiceId ? ` · Invoice ${purchase.invoiceId}` : ""}
                    </TableCell>
                    <TableCell>{paid.map((item) => item.upload.label).join(", ") || "None recorded"}</TableCell>
                    <TableCell>{preview ? `${preview.upload.label} (not counted as purchased)` : "None on this message"}</TableCell>
                    <TableCell>{reversalText(purchase.reversals)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableScrollArea>
      </TableCard>
    </>
  );
}

function purchaseDetail(purchase: {
  messageType: string;
  priceCents: number | null;
  currency: string;
  purchasedAt: Date;
  invoiceId: string | null;
  messageId: string;
  attachments: { role: string; upload: { label: string } }[];
  reversals: { id: string; kind: string; amountCents: number | null }[];
}) {
  const paid = purchase.attachments.filter((item) => item.role === "paid");
  const preview = purchase.attachments.find((item) => item.role === "preview");
  return [
    `Listed ${formatMoney(purchase.priceCents, purchase.currency)}`,
    `Purchased ${formatWhen(purchase.purchasedAt.toISOString())}${purchase.invoiceId ? ` · Invoice ${purchase.invoiceId}` : ""}`,
    `Message ${purchase.messageId}`,
    `Paid attachments: ${paid.map((item) => item.upload.label).join(", ") || "None recorded"}`,
    `Free preview: ${preview ? `${preview.upload.label} (not counted as purchased)` : "None on this message"}`,
    reversalText(purchase.reversals),
  ].join(" · ");
}

function reversalText(reversals: { kind: string; amountCents: number | null }[]) {
  if (reversals.length === 0) return "No refund or dispute on this purchase.";
  return reversals
    .map((reversal) => {
      const label = reversal.kind === "refund" ? "Refund" : "Dispute";
      const amount = reversal.amountCents !== null ? ` for ${formatMoney(reversal.amountCents)}` : "";
      return `${label} recorded separately${amount}. The purchase evidence is unchanged, because a refund is not treated as proof the fan never received the photo.`;
    })
    .join(" ");
}

function EntitlementNote({
  entitlement,
  bypass,
}: {
  entitlement: Awaited<ReturnType<typeof loadEntitlement>>;
  bypass: ReturnType<typeof validationBypassForCreator>;
}) {
  if (!entitlement) return null;
  if (entitlement.state === "active") {
    return (
      <Alert variant="success" title={`Fanvue plan is active${entitlement.planName ? ` (${entitlement.planName})` : ""}`}>
        {entitlement.currentPeriodEnd ? `Current period ends ${formatWhen(entitlement.currentPeriodEnd)}.` : "The subscription is active."}
      </Alert>
    );
  }
  if (bypass.allowed) {
    return (
      <Alert variant="success" title="Allowlisted validation import">
        This development server can import this allowlisted test creator without an active Fanvue plan. Other connected
        accounts still need a plan. Sample purchases are not used.
      </Alert>
    );
  }
  const blocked = validationBlockMessage(bypass);
  if (blocked) {
    return (
      <Alert
        variant="error"
        action={
          entitlement.state === "inactive" && entitlement.checkoutHref ? (
            <a href={entitlement.checkoutHref}>View this plan on Fanvue</a>
          ) : undefined
        }
      >
        {blocked}
      </Alert>
    );
  }
  if (entitlement.state === "inactive") {
    return (
      <Alert
        variant="error"
        action={entitlement.checkoutHref ? <a href={entitlement.checkoutHref}>View price and limits on Fanvue</a> : undefined}
      >
        {entitlement.message}
      </Alert>
    );
  }
  return (
    <Alert variant="error" title="Fanvue could not be reached" action={<a href="/connect">Reconnect Fanvue</a>}>
      {entitlement.message} The sample workspace was not opened in its place.{" "}
      <TextLink href="/support">Contact support</TextLink> if this continues.
    </Alert>
  );
}

function recoveryLink(message: string) {
  if (/reconnect/i.test(message)) return <a href="/connect">Reconnect Fanvue</a>;
  return <a href="/support">Contact support</a>;
}

function PurchaseEmpty({
  mode,
  state,
}: {
  mode: string;
  state: { status: string; lastSynchronizedAt: Date | null } | null;
}) {
  const list = purchaseListState({
    status: state?.status,
    purchaseCount: 0,
    lastSynchronizedAt: state?.lastSynchronizedAt,
  });
  if (mode !== "live") {
    return (
      <EmptyState
        variant="centered"
        titleSize="sm"
        mediaSize="xs"
        title="Sample purchases are missing"
        description="Leave this workspace and open the labeled sample again. Live Fanvue data is not filled in here."
      />
    );
  }
  if (list === "failed") {
    return (
      <EmptyState
        variant="centered"
        titleSize="sm"
        mediaSize="xs"
        title="The import failed"
        description="No purchase list was produced. This is not a finding that the account has no purchases, and the sample story was not used."
        primaryAction={<a href="/support">Contact support</a>}
      />
    );
  }
  if (list === "incomplete") {
    return (
      <EmptyState
        variant="centered"
        titleSize="sm"
        mediaSize="xs"
        title="Import stopped early"
        description="No purchased PPV photo attachments were stored because the read did not finish. That is not an empty purchase history."
      />
    );
  }
  if (list === "not_imported") {
    return (
      <EmptyState
        variant="centered"
        titleSize="sm"
        mediaSize="xs"
        title="Purchase history has not been imported"
        description="Import from the connected Fanvue account. Until that finishes, this screen is not an audit and it is not filled with the sample."
      />
    );
  }
  return (
    <EmptyState
      variant="centered"
      titleSize="sm"
      mediaSize="xs"
      title="No purchased PPV photo attachments were stored"
      description="The last completed import found none. This covers purchased PPV chat photos only. It does not mean a fan has never seen a photo."
    />
  );
}

async function loadEntitlement(workspaceId: string, creatorUuid: string | null) {
  const config = readFanvueConfig();
  try {
    const { client } = await authorizedClient(prisma, workspaceId);
    return readEntitlement(config, client, creatorUuid);
  } catch (error) {
    return {
      state: "unknown" as const,
      message: error instanceof Error ? error.message : "Fanvue could not be reached.",
    };
  }
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
