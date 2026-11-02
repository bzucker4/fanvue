import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { REQUIRED_SCOPES } from "@/lib/fanvue/config";
import { ownerContact } from "@/lib/site";
import { requireWorkspace } from "@/lib/workspace-gate";
import { leaveWorkspace, submitDeletion } from "../actions";

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
      <div className="page-head">
        <div>
          <p className="kicker">Settings</p>
          <h1 style={{ fontSize: "2.4rem" }}>Support and your data</h1>
        </div>
      </div>
      {params.deletion === "received" ? (
        <p className="notice ok">Deletion request received. The workspace is still here until you erase it.</p>
      ) : null}
      <section className="grid-2">
        <article className="card stack">
          <h2>This workspace</h2>
          <p>
            {workspace.mode === "demo" ? "Demo mode" : "Live Fanvue connection"} · {workspace.displayName}
          </p>
          <p className="fine">
            Live reads use {REQUIRED_SCOPES.join(", ")}. The app does not request permission to send chat or change media.
          </p>
          <form action={leaveWorkspace}>
            <button className="button-secondary" type="submit">
              Leave this workspace
            </button>
          </form>
          <p className="fine">Leaving keeps the data until you delete it. The next demo start creates a new sample workspace.</p>
        </article>
        <article className="card stack">
          <h2>Help</h2>
          <p>
            Support: <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>
          </p>
          <p>
            Security: <a href={`mailto:${contact.securityEmail}`}>{contact.securityEmail}</a>
          </p>
          {contact.supportIsPlaceholder || contact.securityIsPlaceholder ? (
            <p className="notice error">Support or security email is still the example placeholder. The owner must replace it before submission.</p>
          ) : null}
          <p>
            <Link href="/support">Support page</Link> · <Link href="/security">Security contact</Link> ·{" "}
            <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/terms">Terms</Link>
          </p>
        </article>
      </section>
      <section className="card stack">
        <h2>Delete creator data</h2>
        <p>
          Erasing now removes this workspace, imported purchases, duplicate decisions, bundles, and encrypted Fanvue
          tokens. It does not delete anything inside Fanvue.
        </p>
        <form action={submitDeletion} className="stack">
          <label className="field">
            Contact email
            <input name="contact" type="email" required placeholder="you@example.com" />
          </label>
          <label className="field">
            Note
            <textarea name="detail" rows={4} placeholder="Optional context for the operator" />
          </label>
          <label>
            <input type="checkbox" name="eraseNow" value="yes" defaultChecked /> Erase this workspace now
          </label>
          <button className="button-danger" type="submit">
            Submit deletion request
          </button>
        </form>
      </section>
    </WorkspaceShell>
  );
}
