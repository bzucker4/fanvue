import { Alert, Card, CardContent } from "@fanvue/ui";
import { DraftBanner, PageIntro, SiteFooter, SiteHeader, TextLink } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Support" };

export default function SupportPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10">
        <DraftBanner />
        <Card hierarchy="primary" type="container">
          <CardContent className="flex flex-col gap-4 p-6">
            <PageIntro kicker="Support" title="Help for creators" />
            <p className="typography-body-default-16px-regular">
              Email <TextLink href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</TextLink> for setup help, a
              mistaken duplicate link, or a question about an audit result.
            </p>
            {contact.supportIsPlaceholder ? (
              <Alert variant="error">Replace SUPPORT_EMAIL before submission. support@example.com is a placeholder.</Alert>
            ) : null}
            <h2 className="typography-header-heading-xs">Setup</h2>
            <ol className="typography-body-default-16px-regular list-decimal space-y-2 pl-5">
              <li>Open the labeled sample, or connect a Fanvue creator account with the read scopes on the connect screen.</li>
              <li>On a live account, import purchase history from Connection. The sample does not replace a failed import.</li>
              <li>In the library, confirm two uploads only when you know they are the same photo. You can reverse that link. The app does not detect duplicates for you.</li>
              <li>Build a photo bundle, choose the fan or audience, and read the audit. Confirmed overlap cites a purchased PPV chat attachment. Incomplete history is not a “no purchase” result.</li>
            </ol>
            <p className="typography-body-default-16px-regular">
              Supported evidence is purchased PPV chat photos, including a broadcast purchase that appears in per-chat
              history. Free previews, messages that were only sent, post purchases, tips, subscriptions, and video are
              outside the audit. Listed price is the message’s pricing.USD.price, not the amount the fan paid. “No known
              purchase overlap” does not mean a fan has never seen the photo.
            </p>
            <h2 className="typography-header-heading-xs">Reading a result</h2>
            <p className="typography-body-default-16px-regular">
              Confirmed purchase overlap cites a purchased message. A possible duplicate is only a suggestion. No known
              purchase overlap is limited to the history that was synchronized. Incomplete history means the absence of a
              match is not a finding.
            </p>
            <p className="typography-body-default-16px-regular">
              Security reports go to <TextLink href="/security">the security contact</TextLink>. Account deletion is on the
              settings screen inside a workspace.
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
