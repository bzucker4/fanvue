import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@/lib/db";
import { formatMoney, formatWhen, messageTypeLabel } from "@/lib/format";
import { readFanvueConfig, validationImportEnabled } from "@/lib/fanvue/config";
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
  const validation = validationImportEnabled();
  const entitlement = workspace.mode === "live" ? await loadEntitlement(workspace.id, workspace.fanvueUserUuid) : null;
  const canImport = entitlement?.state === "active" || validation;
  const gaps = asStrings(state?.gaps);
  const unsupported = asStrings(state?.unsupported);

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/connection">
      <div className="page-head">
        <div>
          <p className="kicker">Connection and import</p>
          <h1 style={{ fontSize: "2.4rem" }}>{workspace.displayName}</h1>
          <p className="fine">{workspace.handle ? `@${workspace.handle}` : "No public handle"}</p>
        </div>
        {workspace.mode === "live" ? (
          <form action={importLiveHistory}>
            <button className="button" type="submit" disabled={!canImport}>
              {state?.lastSynchronizedAt ? "Reconcile missed updates" : "Import purchase history"}
            </button>
          </form>
        ) : (
          <Link className="button" href="/workspace/library">
            Review the sample photos
          </Link>
        )}
      </div>

      {params.imported === "1" ? <p className="notice ok">Import finished. Coverage is shown below.</p> : null}
      {params.error === "import" && state?.lastError ? <p className="notice error">{state.lastError}</p> : null}
      {params.error === "demo-import" ? (
        <p className="notice error">Demo mode does not call Fanvue and cannot run a live import.</p>
      ) : null}

      <section className="stats">
        <div className="stat">
          <span className="kicker">Last synchronization</span>
          <b>{formatWhen(state?.lastSynchronizedAt?.toISOString() ?? null)}</b>
        </div>
        <div className="stat">
          <span className="kicker">Chat history</span>
          <b>{state?.historyComplete ? "Complete" : "Incomplete"}</b>
        </div>
        <div className="stat">
          <span className="kicker">Broadcasts</span>
          <b>{state?.broadcastsIncluded ? "Included" : "Not included"}</b>
        </div>
        <div className="stat">
          <span className="kicker">Purchases stored</span>
          <b>{purchases.length}</b>
        </div>
      </section>

      <section className="card stack">
        <h2>How this history was read</h2>
        <p>{state?.methodNote ?? "No import has run."}</p>
        <p className="fine">
          Chats discovered {state?.chatsDiscovered ?? 0}, chats imported {state?.chatsImported ?? 0}, messages scanned{" "}
          {state?.messagesScanned ?? 0}. Unread state is preserved on live imports by sending markAsRead=false.
        </p>
        {workspace.importState?.billingMode === "validation" ? (
          <p className="notice ok">
            The last import was a validation read. It is not an active Fanvue plan, and it did not use sample purchases.
          </p>
        ) : null}
        {entitlement ? <EntitlementNote entitlement={entitlement} validation={validation} /> : null}
      </section>

      {gaps.length > 0 ? (
        <section className="card stack">
          <h2>Gaps</h2>
          {gaps.map((gap) => (
            <p key={gap}>{gap}</p>
          ))}
        </section>
      ) : null}

      {unsupported.length > 0 ? (
        <section className="card stack">
          <h2>Outside this audit</h2>
          {unsupported.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
      ) : null}

      <section className="stack">
        <h2>Purchase evidence</h2>
        {purchases.length === 0 ? (
          <div className="card empty">
            <h3>No purchased PPV attachments yet</h3>
            <p className="fine">
              {workspace.mode === "live"
                ? "Import history from the connected account. An empty live workspace is not filled with the sample story."
                : "The sample workspace should already contain Jordan Hale’s purchases. Reload the demo if this stays empty."}
            </p>
          </div>
        ) : (
          purchases.map((purchase) => {
            const paid = purchase.attachments.filter((item) => item.role === "paid");
            const preview = purchase.attachments.find((item) => item.role === "preview");
            return (
              <article key={purchase.id} className="ledger-row">
                <div className="split">
                  <strong>
                    {purchase.fan.displayName} · {messageTypeLabel(purchase.messageType)}
                  </strong>
                  <span>{formatMoney(purchase.priceCents, purchase.currency)}</span>
                </div>
                <p className="fine">
                  Purchased {formatWhen(purchase.purchasedAt.toISOString())}
                  {purchase.invoiceId ? ` · Invoice ${purchase.invoiceId}` : ""}
                </p>
                <p className="mono">Message {purchase.messageId}</p>
                <p>
                  Paid attachments: {paid.map((item) => item.upload.label).join(", ") || "None recorded"}
                </p>
                <p className="fine">
                  Free preview: {preview ? `${preview.upload.label} (not counted as purchased)` : "None on this message"}
                </p>
                {purchase.reversals.map((reversal) => (
                  <p key={reversal.id}>
                    {reversal.kind === "refund" ? "Refund" : "Dispute"} recorded separately
                    {reversal.amountCents !== null ? ` for ${formatMoney(reversal.amountCents)}` : ""}. The purchase
                    evidence above is unchanged, because a refund is not treated as proof the fan never received the
                    photo.
                  </p>
                ))}
              </article>
            );
          })
        )}
      </section>
    </WorkspaceShell>
  );
}

function EntitlementNote({
  entitlement,
  validation,
}: {
  entitlement: Awaited<ReturnType<typeof loadEntitlement>>;
  validation: boolean;
}) {
  if (!entitlement) return null;
  if (entitlement.state === "active") {
    return (
      <p className="notice ok">
        Fanvue plan is active{entitlement.planName ? ` (${entitlement.planName})` : ""}.
        {entitlement.currentPeriodEnd ? ` Current period ends ${formatWhen(entitlement.currentPeriodEnd)}.` : ""}
      </p>
    );
  }
  if (validation) {
    return (
      <p className="notice ok">
        Validation import is on, so this server can read the connected account without an active Fanvue plan. Sample
        purchases are not used. Set FANVUE_VALIDATION_IMPORT to false before charging creators.
        {entitlement.state === "inactive" && entitlement.checkoutHref ? (
          <>
            {" "}
            <a href={entitlement.checkoutHref}>The Fanvue plan deeplink stays available.</a>
          </>
        ) : null}
      </p>
    );
  }
  if (entitlement.state === "inactive") {
    return (
      <p className="notice error">
        {entitlement.message}{" "}
        {entitlement.checkoutHref ? (
          <a href={entitlement.checkoutHref}>Open the plan on the Fanvue App Store</a>
        ) : null}
      </p>
    );
  }
  return <p className="notice error">{entitlement.message}</p>;
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
