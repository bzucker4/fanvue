import { Card, CardContent } from "@fanvue/ui";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10">
        <Card hierarchy="primary" type="container">
          <CardContent className="flex flex-col gap-4 p-6">
            <PageIntro kicker="Privacy Policy" title="Privacy Policy">
              <p className="typography-body-small-14px-regular text-content-secondary">
                Operator: {contact.ownerName}. Contact: {contact.supportEmail}. Effective date: November 2, 2026.
              </p>
            </PageIntro>
            <h2 className="typography-header-heading-xs">Who this describes</h2>
            <p className="typography-body-default-16px-regular">
              This policy describes Bundle Audit, an independent application that creators can connect to Fanvue. It is
              not Fanvue’s privacy policy. The operator is an individual, Brian Zucker, who decides how and why the data below is
              handled. You must be at least 18 to use the app.
            </p>
            <h2 className="typography-header-heading-xs">Data the app is built to store</h2>
            <ul className="typography-body-default-16px-regular list-disc space-y-2 pl-5">
              <li>Creator profile identifiers returned by Fanvue: uuid, handle, and display name.</li>
              <li>OAuth access and refresh tokens, encrypted at rest, and the scopes granted.</li>
              <li>Fan uuid, handle, and display name for people who appear in imported chats.</li>
              <li>A short excerpt of the text of a priced message, kept so the creator can recognize which offer a purchase belongs to.</li>
              <li>A session cookie (<code>ba_session</code>, httpOnly) that keeps the creator signed in, and webhook event ids kept to avoid processing the same event twice.</li>
              <li>Media identifiers, type, and status. Signed media URLs and media files are not stored for fingerprinting.</li>
              <li>PPV chat purchase evidence: message id, message type, listed price, purchase time, paid attachment ids, and the free-preview id kept separate.</li>
              <li>Refund and dispute records, stored separately from purchases.</li>
              <li>Duplicate relationships the creator confirms, rejects, or reverses.</li>
              <li>Bundles, audience selections, import coverage, and deletion requests.</li>
            </ul>
            <h2 className="typography-header-heading-xs">Demo mode</h2>
            <p className="typography-body-default-16px-regular">The sample workspace contains invented still-life records. It is not mixed with a connected Fanvue account.</p>
            <h2 className="typography-header-heading-xs">Why it is used</h2>
            <p className="typography-body-default-16px-regular">The data is used to show a creator whether a proposed photo bundle overlaps purchases already recorded for a selected fan or audience, and to operate, secure, and support that feature.</p>
            <h2 className="typography-header-heading-xs">Sharing and service providers</h2>
            <p className="typography-body-default-16px-regular">
              The app calls Fanvue with the creator’s token to read the data above and, when billing is configured, to
              read whether the creator has an active Fanvue plan. The app does not sell personal data, show advertising,
              or use imported data to train models.
            </p>
            <p className="typography-body-default-16px-regular">The operator uses these providers to run the app:</p>
            <ul className="typography-body-default-16px-regular list-disc space-y-2 pl-5">
              <li>Fanvue, the platform the creator connects.</li>
              <li>Vercel, which hosts the application.</li>
              <li>Neon, which hosts the PostgreSQL database. [Database region: to be filled in once the database is created.]</li>
            </ul>
            <h2 className="typography-header-heading-xs">Security</h2>
            <p className="typography-body-default-16px-regular">
              Fanvue access and refresh tokens are encrypted at rest. The app requests read-only scopes and cannot send
              messages or change Fanvue media. No system is perfectly secure. Report a vulnerability to
              {" "}{contact.securityEmail}.
            </p>
            <h2 className="typography-header-heading-xs">Retention</h2>
            <p className="typography-body-default-16px-regular">
              Workspace data is kept while the creator keeps the workspace. Erasing the workspace in Settings removes the
              tokens, imported records, and any deletion requests attached to it immediately. A sign-in attempt is
              deleted when it completes or is rejected; an abandoned attempt (state and an encrypted code verifier)
              is removed by a daily cleanup after its 10-minute window ends. Requests sent by email are handled within a
              reasonable time. Database backups are kept on the database provider’s backup schedule and are overwritten
              as it rolls over.
            </p>
<h2 className="typography-header-heading-xs">Deletion</h2>
              <p className="typography-body-default-16px-regular">
                A creator can erase the workspace, tokens, and imported records from Settings. A deletion request can
                also be sent to the support address. Erasing inside the app is immediate for that workspace. A request
                sent by email is handled within a reasonable time.
              </p>
            <h2 className="typography-header-heading-xs">Your rights and regions</h2>
            <p className="typography-body-default-16px-regular">
              Depending on where you live, you may have the right to access, correct, export, or delete your personal
              data, to object to or restrict processing, and to complain to a data-protection authority. Contact
              {" "}{contact.supportEmail} to use these rights. The operator’s legal basis for processing is providing the
              service the creator asked for and keeping it secure. Data is processed and stored in the United States,
              so if you are elsewhere your data is transferred there. The operator has not appointed a UK or EU
              representative.
            </p>
            <h2 className="typography-header-heading-xs">Children</h2>
            <p className="typography-body-default-16px-regular">The app is not for anyone under 18 and does not knowingly collect their data.</p>
            <h2 className="typography-header-heading-xs">Changes</h2>
            <p className="typography-body-default-16px-regular">The operator will update this page and its effective date when practices change. Effective date: November 2, 2026.</p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
