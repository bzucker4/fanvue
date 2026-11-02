import { Alert, Card, CardContent, CardHeader, CardTitle } from "@fanvue/ui";
import { PageIntro, TextLink } from "@/components/chrome";
import { EraseWorkspaceDialog, RequestDeletionForm } from "@/components/workspace-deletion";
import { SubmitButton } from "@/components/submit-button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { REQUIRED_SCOPES } from "@/lib/fanvue/config";
import { ownerContact } from "@/lib/site";
import { requireWorkspace } from "@/lib/workspace-gate";
import { leaveWorkspace } from "../actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deletion?: string }>;
}) {
  const workspace = await requireWorkspace();
  if (!workspace) return null;
  const params = await searchParams;
  const contact = ownerContact();

  return (
    <WorkspaceShell mode={workspace.mode} displayName={workspace.displayName} current="/workspace/settings">
      <PageIntro kicker="Settings" title="Support and your data" />
      {params.deletion === "received" ? (
        <Alert variant="success">Deletion request received. The workspace is still here until you erase it.</Alert>
      ) : null}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card hierarchy="primary" type="header-only">
          <CardHeader>
            <CardTitle>This workspace</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="typography-body-default-16px-regular">
              {workspace.mode === "demo" ? "Demo mode" : "Live Fanvue connection"} · {workspace.displayName}
            </p>
            <p className="typography-body-small-14px-regular text-content-secondary">
              Live reads use {REQUIRED_SCOPES.join(", ")}. The app does not request permission to send chat or change media.
            </p>
            <form action={leaveWorkspace}>
              <SubmitButton variant="secondary" size="40">
                Leave this workspace
              </SubmitButton>
            </form>
            <p className="typography-body-small-14px-regular text-content-secondary">
              Leaving keeps the data until you delete it. The next demo start creates a new sample workspace.
            </p>
          </CardContent>
        </Card>
        <Card hierarchy="primary" type="header-only">
          <CardHeader>
            <CardTitle>Help</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="typography-body-default-16px-regular">
              Support: <TextLink href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</TextLink>
            </p>
            <p className="typography-body-default-16px-regular">
              Security: <TextLink href={`mailto:${contact.securityEmail}`}>{contact.securityEmail}</TextLink>
            </p>
            {contact.supportIsPlaceholder || contact.securityIsPlaceholder ? (
              <Alert variant="error">
                Support or security email is still the example placeholder. The owner must replace it before submission.
              </Alert>
            ) : null}
            <p className="flex flex-wrap gap-3">
              <TextLink href="/support">Support page</TextLink>
              <TextLink href="/security">Security contact</TextLink>
              <TextLink href="/legal/privacy">Privacy</TextLink>
              <TextLink href="/legal/terms">Terms</TextLink>
            </p>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card hierarchy="primary" type="header-only">
          <CardHeader>
            <CardTitle>Request deletion</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestDeletionForm />
          </CardContent>
        </Card>
        <Card hierarchy="primary" type="header-only">
          <CardHeader>
            <CardTitle>Erase workspace</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="typography-body-default-16px-regular">
              Erasure is off until you open the confirmation and acknowledge it. It removes this workspace, imported
              purchases, duplicate decisions, bundles, and encrypted Fanvue tokens. It does not delete anything inside
              Fanvue.
            </p>
            <EraseWorkspaceDialog />
          </CardContent>
        </Card>
      </section>
    </WorkspaceShell>
  );
}
