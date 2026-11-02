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
            <p className="typography-body-default-16px-regular">
              Creators open Bundle Audit, connect with Fanvue, and import purchase history from the connection screen. The
              sample workspace needs no Fanvue account.
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
