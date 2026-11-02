import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace-gate";
import { createBundle } from "../actions";

export const metadata = { title: "Bundles" };

export default async function BundlesPage() {
  const workspace = await requireWorkspace();
  if (!workspace) return null;
  const bundles = await prisma.bundle.findMany({
    where: { workspaceId: workspace.id },
    include: { items: true, audience: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/bundles">
      <div className="page-head">
        <div>
          <p className="kicker">Bundle builder</p>
          <h1 style={{ fontSize: "2.4rem" }}>Proposed photo sets</h1>
        </div>
      </div>
      <section className="card stack">
        <h2>New bundle</h2>
        <form action={createBundle} className="stack">
          <label className="field">
            Name
            <input name="name" required maxLength={80} placeholder="Spring still life" />
          </label>
          <button className="button" type="submit">
            Create bundle
          </button>
        </form>
      </section>
      {bundles.length === 0 ? (
        <div className="card empty">
          <h3>No bundles yet</h3>
          <p className="fine">Create one, choose photos, then choose who it is for.</p>
        </div>
      ) : (
        <div className="stack">
          {bundles.map((bundle) => (
            <Link key={bundle.id} href={`/workspace/bundles/${bundle.id}`} className="ledger-row" style={{ textDecoration: "none" }}>
              <strong>{bundle.name}</strong>
              <p className="fine">
                {bundle.items.length} photo{bundle.items.length === 1 ? "" : "s"} · {bundle.audience.length} fan
                {bundle.audience.length === 1 ? "" : "s"} selected
              </p>
            </Link>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
