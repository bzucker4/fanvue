import { DraftBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Security" };

export default function SecurityPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="section stack">
        <DraftBanner />
        <div className="card stack">
          <p className="kicker">Security contact</p>
          <h1 style={{ fontSize: "2.4rem" }}>Report a vulnerability</h1>
          <p>
            Email <a href={`mailto:${contact.securityEmail}`}>{contact.securityEmail}</a> with the page, the time, and
            enough detail to reproduce the issue. Please avoid sending Fanvue access tokens or fan data in the first
            message.
          </p>
          {contact.securityIsPlaceholder ? (
            <p className="notice error">Replace SECURITY_EMAIL before submission. security@example.com is a placeholder.</p>
          ) : null}
          <p>The app stores Fanvue tokens encrypted on the server, requests read scopes only, and verifies Fanvue webhook signatures before it stores an event.</p>
          <p className="fine">This contact is for the app operator named on the privacy page, not for Fanvue the platform.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
