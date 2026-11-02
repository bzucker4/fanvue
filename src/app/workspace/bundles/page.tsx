import { Card, CardContent, CardHeader, CardTitle, EmptyState, Link as FanvueLink, TextField } from "@fanvue/ui";
import NextLink from "next/link";
import { PageIntro } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
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
      <PageIntro kicker="Bundle builder" title="Proposed photo sets" />
      <Card hierarchy="primary" type="header-only">
        <CardHeader>
          <CardTitle>New bundle</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBundle} className="flex max-w-md flex-col items-start gap-3">
            <TextField name="name" label="Name" required maxLength={80} placeholder="Spring still life" fullWidth />
            <SubmitButton variant="primary" size="40">
              Create bundle
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
      {bundles.length === 0 ? (
        <EmptyState
          variant="centered"
          titleSize="sm"
          mediaSize="xs"
          title="No bundles yet"
          description="Create one, choose photos, then choose who it is for."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {bundles.map((bundle) => (
            <FanvueLink key={bundle.id} asChild size="16">
              <NextLink
                href={`/workspace/bundles/${bundle.id}`}
                className="rounded-md border border-border-primary bg-surface-primary p-4 no-underline"
              >
                <strong className="typography-body-default-16px-semibold block text-content-primary">{bundle.name}</strong>
                <p className="typography-body-small-14px-regular mt-1 text-content-secondary">
                  {bundle.items.length} photo{bundle.items.length === 1 ? "" : "s"} · {bundle.audience.length} fan
                  {bundle.audience.length === 1 ? "" : "s"} selected
                </p>
              </NextLink>
            </FanvueLink>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
