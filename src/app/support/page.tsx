import { SiteFooter, SiteHeader, DraftBanner } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Support" };

export default function SupportPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="section stack">
        <DraftBanner />
        <div className="card stack">
          <p className="kicker">Support</p>
          <h1 style={{ fontSize: "2.4rem" }}>Help for creators</h1>
          <p>
            Email <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a> for setup help, a mistaken
            duplicate link, or a question about an audit result.
          </p>
          {contact.supportIsPlaceholder ? (
            <p className="notice error">Replace SUPPORT_EMAIL before submission. support@example.com is a placeholder.</p>
          ) : null}
          <h2>Setup</h2>
          <p>Creators open Bundle Audit, connect with Fanvue, and import purchase history from the connection screen. The sample workspace needs no Fanvue account.</p>
          <h2>Reading a result</h2>
          <p>Confirmed purchase overlap cites a purchased message. A possible duplicate is only a suggestion. No known purchase overlap is limited to the history that was synchronized. Incomplete history means the absence of a match is not a finding.</p>
          <p>
            Security reports go to <a href="/security">the security contact</a>. Account deletion is on the settings screen inside a workspace.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
