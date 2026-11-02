import { Card, CardContent } from "@fanvue/ui";
import { DraftBanner, PageIntro, SiteFooter, SiteHeader } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10">
        <DraftBanner />
        <Card hierarchy="primary" type="container">
          <CardContent className="flex flex-col gap-4 p-6">
            <PageIntro kicker="Terms draft" title="Terms of Service">
              <p className="typography-body-small-14px-regular text-content-secondary">
                Operator: {contact.ownerName}. Contact: {contact.supportEmail}. Effective date: November 2, 2026.
              </p>
            </PageIntro>
            <h2 className="typography-header-heading-xs">The service</h2>
            <p className="typography-body-default-16px-regular">
              Bundle Audit helps a creator compare a proposed photo bundle with PPV chat purchases imported from a
              connected Fanvue account, or with a separate sample workspace. It is read-only in this version. It does
              not send messages or delete Fanvue media.
            </p>
            <h2 className="typography-header-heading-xs">No official affiliation</h2>
            <p className="typography-body-default-16px-regular">The operator is not Fanvue. Fanvue’s own terms govern the creator’s Fanvue account. Names and marks of Fanvue remain Fanvue’s.</p>
            <h2 className="typography-header-heading-xs">What results mean</h2>
            <p className="typography-body-default-16px-regular">
              An audit reports purchase evidence the app was able to synchronize. It does not promise that a fan has
              never seen a photo, that history is complete when the coverage panel says otherwise, or that a refund
              removed the fan’s copy. Duplicate photos match only after the creator confirms them.
            </p>
            <h2 className="typography-header-heading-xs">Payment</h2>
            <p className="typography-body-default-16px-regular">
              Live import and live audit require an active Fanvue plan. Payment stays on Fanvue. This app does not add a
              card checkout and does not publish its own price. The price, limits, and taxes are the ones Fanvue shows
              before payment. The operator still has to create that plan in the Fanvue Developer Area. This page does
              not name a dollar amount.
            </p>
            <h2 className="typography-header-heading-xs">Acceptable use</h2>
            <p className="typography-body-default-16px-regular">Do not use the app to harass fans, evade Fanvue’s rules, or upload unlawful content. The sample library is for demonstration and is not a creator’s catalog.</p>
            <h2 className="typography-header-heading-xs">Accounts and eligibility</h2>
            <p className="typography-body-default-16px-regular">You must be at least 18 and allowed to use Fanvue. You are responsible for your Fanvue connection and for activity in your workspace. You can disconnect or erase your workspace in Settings at any time.</p>
            <h2 className="typography-header-heading-xs">Warranty disclaimer</h2>
            <p className="typography-body-default-16px-regular">
              The app is provided “as is” and “as available”, without warranties of any kind, express or implied,
              including fitness for a particular purpose and accuracy of results. It depends on data from Fanvue that
              the operator does not control.
            </p>
            <h2 className="typography-header-heading-xs">Limitation of liability</h2>
            <p className="typography-body-default-16px-regular">
              To the extent the law allows, the operator is not liable for indirect, incidental, or consequential losses,
              or for lost revenue or data, and total liability for any claim is limited to the fees you paid for the app in the
              12 months before the claim. [Counsel to confirm wording and local limits.]
            </p>
            <h2 className="typography-header-heading-xs">Termination and changes</h2>
            <p className="typography-body-default-16px-regular">
              The operator may suspend access for misuse or if Fanvue ends the integration. You may stop at any time.
              The operator may update these terms; continued use after the effective date means you accept them.
              Effective date: November 2, 2026.
            </p>
            <h2 className="typography-header-heading-xs">Governing law</h2>
            <p className="typography-body-default-16px-regular">[Governing law and venue: to be chosen with counsel.] Questions: {contact.supportEmail}.</p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
