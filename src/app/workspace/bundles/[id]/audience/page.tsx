import Link from "next/link";
import { notFound } from "next/navigation";
import { BundleSteps, WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace-gate";
import { toggleAudience } from "../../../actions";

export const metadata = { title: "Audience" };

export default async function AudiencePage({ params }: { params: Promise<{ id: string }> }) {
  const workspace = await requireWorkspace();
  if (!workspace) return null;
  const { id } = await params;
  const bundle = await prisma.bundle.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { audience: true, items: true },
  });
  if (!bundle) notFound();
  const fans = await prisma.fan.findMany({ where: { workspaceId: workspace.id }, orderBy: { displayName: "asc" } });
  const selected = new Set(bundle.audience.map((item) => item.fanId));

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/bundles">
      <div className="page-head">
        <div>
          <p className="kicker">Audience</p>
          <h1 style={{ fontSize: "2.4rem" }}>Who is this bundle for?</h1>
          <p className="fine">{bundle.name}. The audit uses only the fans you select from this creator’s imported chats.</p>
        </div>
        <BundleSteps id={bundle.id} current="audience" />
      </div>
      {fans.length === 0 ? (
        <div className="card empty">
          <h3>No fans imported</h3>
          <p className="fine">Fans appear from chat history. This list is not a cross-platform identity graph.</p>
        </div>
      ) : (
        <div className="stack">
          {fans.map((fan) => {
            const on = selected.has(fan.id);
            return (
              <article key={fan.id} className="fan-row">
                <div className="split">
                  <div>
                    <strong>{fan.displayName}</strong>
                    <p className="fine">@{fan.handle}</p>
                  </div>
                  <form action={toggleAudience}>
                    <input type="hidden" name="bundleId" value={bundle.id} />
                    <input type="hidden" name="fanId" value={fan.id} />
                    <button className={on ? "button" : "button-secondary"} type="submit">
                      {on ? "Remove from audience" : "Include"}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="actions">
        <Link className="button" href={`/workspace/bundles/${bundle.id}/audit`} aria-disabled={bundle.items.length === 0 || selected.size === 0}>
          Continue to audit
        </Link>
      </div>
    </WorkspaceShell>
  );
}
