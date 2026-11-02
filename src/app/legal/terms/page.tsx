import { DraftBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="section stack">
        <DraftBanner />
        <article className="card stack">
          <p className="kicker">Terms draft</p>
          <h1 style={{ fontSize: "2.4rem" }}>Terms of Service</h1>
          <p className="fine">Operator: {contact.ownerName}. Contact: {contact.supportEmail}. Effective date: [owner to insert].</p>
          <h2>The service</h2>
          <p>
            Bundle Audit helps a creator compare a proposed photo bundle with PPV chat purchases imported from a
            connected Fanvue account, or with a separate sample workspace. It is read-only in this version. It does
            not send messages or delete Fanvue media.
          </p>
          <h2>No official affiliation</h2>
          <p>The operator is not Fanvue. Fanvue’s own terms govern the creator’s Fanvue account. Names and marks of Fanvue remain Fanvue’s.</p>
          <h2>What results mean</h2>
          <p>
            An audit reports purchase evidence the app was able to synchronize. It does not promise that a fan has
            never seen a photo, that history is complete when the coverage panel says otherwise, or that a refund
            removed the fan’s copy. Duplicate photos match only after the creator confirms them.
          </p>
          <h2>Payment</h2>
          <p>
            If the operator charges for live import or live audit, payment is through Fanvue. The app does not add a
            separate card checkout. Plan price and taxes are the ones Fanvue shows. [Owner to describe the free and
            paid boundaries exactly as listed on Fanvue.]
          </p>
          <h2>Acceptable use</h2>
          <p>Do not use the app to harass fans, evade Fanvue’s rules, or upload unlawful content. The sample library is for demonstration and is not a creator’s catalog.</p>
          <h2>Liability and law</h2>
          <p>[Owner and counsel to add limitation of liability, warranty disclaimer, governing law, and account termination.]</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
