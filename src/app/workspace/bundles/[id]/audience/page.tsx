import { EmptyState } from "@fanvue/ui";
import { notFound } from "next/navigation";
import { PageIntro, PrimaryLink } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
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
      <PageIntro
        kicker="Audience"
        title="Who is this bundle for?"
        action={<BundleSteps id={bundle.id} current="audience" />}
      >
        <p className="typography-body-small-14px-regular text-content-secondary">
          {bundle.name}. The audit uses only the fans you select from this creator’s imported chats.
        </p>
      </PageIntro>
      {fans.length === 0 ? (
        <EmptyState
          variant="centered"
          titleSize="sm"
          mediaSize="xs"
          title="No fans imported"
          description="Fans appear from chat history. This list is not a cross-platform identity graph."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {fans.map((fan) => {
            const on = selected.has(fan.id);
            return (
              <article key={fan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-primary bg-surface-primary p-4">
                <div>
                  <strong className="typography-body-default-16px-semibold">{fan.displayName}</strong>
                  <p className="typography-body-small-14px-regular text-content-secondary">@{fan.handle}</p>
                </div>
                <form action={toggleAudience}>
                  <input type="hidden" name="bundleId" value={bundle.id} />
                  <input type="hidden" name="fanId" value={fan.id} />
                  <SubmitButton variant={on ? "primary" : "secondary"} size="32">
                    {on ? "Remove from audience" : "Include"}
                  </SubmitButton>
                </form>
              </article>
            );
          })}
        </div>
      )}
      <div>
        <PrimaryLink href={`/workspace/bundles/${bundle.id}/audit`}>Continue to audit</PrimaryLink>
      </div>
    </WorkspaceShell>
  );
}
