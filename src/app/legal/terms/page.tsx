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
                Operator: {contact.ownerName}. Contact: {contact.supportEmail}. Effective date: [owner to insert].
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
              If the operator charges for live import or live audit, payment is through Fanvue. The app does not add a
              separate card checkout. Plan price and taxes are the ones Fanvue shows. [Owner to describe the free and
              paid boundaries exactly as listed on Fanvue.]
            </p>
            <h2 className="typography-header-heading-xs">Acceptable use</h2>
            <p className="typography-body-default-16px-regular">Do not use the app to harass fans, evade Fanvue’s rules, or upload unlawful content. The sample library is for demonstration and is not a creator’s catalog.</p>
            <h2 className="typography-header-heading-xs">Liability and law</h2>
            <p className="typography-body-default-16px-regular">[Owner and counsel to add limitation of liability, warranty disclaimer, governing law, and account termination.]</p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
