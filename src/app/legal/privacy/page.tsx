import { DraftBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="section stack">
        <DraftBanner />
        <article className="card stack">
          <p className="kicker">Privacy Policy draft</p>
          <h1 style={{ fontSize: "2.4rem" }}>Privacy Policy</h1>
          <p className="fine">Operator: {contact.ownerName}. Contact: {contact.supportEmail}. Effective date: [owner to insert].</p>
          <h2>Who this describes</h2>
          <p>
            This draft describes Bundle Audit, an independent application that creators can connect to Fanvue. It is
            not Fanvue’s privacy policy. Replace the operator name, contact, and effective date before publication.
          </p>
          <h2>Data the app is built to store</h2>
          <ul>
            <li>Creator profile identifiers returned by Fanvue: uuid, handle, and display name.</li>
            <li>OAuth access and refresh tokens, encrypted at rest, and the scopes granted.</li>
            <li>Fan uuid, handle, and display name for people who appear in imported chats.</li>
            <li>Media identifiers, type, and status. Signed media URLs and media files are not stored for fingerprinting.</li>
            <li>PPV chat purchase evidence: message id, message type, price, purchase time, paid attachment ids, and the free-preview id kept separate.</li>
            <li>Refund and dispute records, stored separately from purchases.</li>
            <li>Duplicate relationships the creator confirms, rejects, or reverses.</li>
            <li>Bundles, audience selections, import coverage, and deletion requests.</li>
          </ul>
          <h2>Demo mode</h2>
          <p>The sample workspace contains invented still-life records. It is not mixed with a connected Fanvue account.</p>
          <h2>Why it is used</h2>
          <p>The data is used to show a creator whether a proposed photo bundle overlaps purchases already recorded for a selected fan or audience, and to operate, secure, and support that feature.</p>
          <h2>Sharing</h2>
          <p>
            The app calls Fanvue with the creator’s token to read the data above and, when billing is configured, to
            read whether the creator has an active Fanvue plan. [Owner to name any subprocessors, hosting region, and
            retention period.]
          </p>
          <h2>Deletion</h2>
          <p>A creator can erase the workspace, tokens, and imported records from Settings. A deletion request can also be sent to the support address. [Owner to state the completion window.]</p>
          <h2>Regions</h2>
          <p>[Owner and counsel to add the GDPR, UK GDPR, and other disclosures that apply to the operator, including the legal basis for processing and international transfers.]</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
