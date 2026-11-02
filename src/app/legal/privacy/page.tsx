import { Card, CardContent } from "@fanvue/ui";
import { DraftBanner, PageIntro, SiteFooter, SiteHeader } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10">
        <DraftBanner />
        <Card hierarchy="primary" type="container">
          <CardContent className="flex flex-col gap-4 p-6">
            <PageIntro kicker="Privacy Policy draft" title="Privacy Policy">
              <p className="typography-body-small-14px-regular text-content-secondary">
                Operator: {contact.ownerName}. Contact: {contact.supportEmail}. Effective date: [owner to insert].
              </p>
            </PageIntro>
            <h2 className="typography-header-heading-xs">Who this describes</h2>
            <p className="typography-body-default-16px-regular">
              This draft describes Bundle Audit, an independent application that creators can connect to Fanvue. It is
              not Fanvue’s privacy policy. Replace the operator name, contact, and effective date before publication.
            </p>
            <h2 className="typography-header-heading-xs">Data the app is built to store</h2>
            <ul className="typography-body-default-16px-regular list-disc space-y-2 pl-5">
              <li>Creator profile identifiers returned by Fanvue: uuid, handle, and display name.</li>
              <li>OAuth access and refresh tokens, encrypted at rest, and the scopes granted.</li>
              <li>Fan uuid, handle, and display name for people who appear in imported chats.</li>
              <li>Media identifiers, type, and status. Signed media URLs and media files are not stored for fingerprinting.</li>
              <li>PPV chat purchase evidence: message id, message type, price, purchase time, paid attachment ids, and the free-preview id kept separate.</li>
              <li>Refund and dispute records, stored separately from purchases.</li>
              <li>Duplicate relationships the creator confirms, rejects, or reverses.</li>
              <li>Bundles, audience selections, import coverage, and deletion requests.</li>
            </ul>
            <h2 className="typography-header-heading-xs">Demo mode</h2>
            <p className="typography-body-default-16px-regular">The sample workspace contains invented still-life records. It is not mixed with a connected Fanvue account.</p>
            <h2 className="typography-header-heading-xs">Why it is used</h2>
            <p className="typography-body-default-16px-regular">The data is used to show a creator whether a proposed photo bundle overlaps purchases already recorded for a selected fan or audience, and to operate, secure, and support that feature.</p>
            <h2 className="typography-header-heading-xs">Sharing</h2>
            <p className="typography-body-default-16px-regular">
              The app calls Fanvue with the creator’s token to read the data above and, when billing is configured, to
              read whether the creator has an active Fanvue plan. [Owner to name any subprocessors, hosting region, and
              retention period.]
            </p>
            <h2 className="typography-header-heading-xs">Deletion</h2>
            <p className="typography-body-default-16px-regular">A creator can erase the workspace, tokens, and imported records from Settings. A deletion request can also be sent to the support address. [Owner to state the completion window.]</p>
            <h2 className="typography-header-heading-xs">Regions</h2>
            <p className="typography-body-default-16px-regular">[Owner and counsel to add the GDPR, UK GDPR, and other disclosures that apply to the operator, including the legal basis for processing and international transfers.]</p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
