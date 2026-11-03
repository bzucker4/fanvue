import { Alert, Card, CardContent } from "@fanvue/ui";
import { PageIntro, SiteFooter, SiteHeader, TextLink } from "@/components/chrome";
import { ownerContact } from "@/lib/site";

export const metadata = { title: "Security" };

export default function SecurityPage() {
  const contact = ownerContact();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10">
        <Card hierarchy="primary" type="container">
          <CardContent className="flex flex-col gap-4 p-6">
            <PageIntro kicker="Security contact" title="Report a vulnerability" />
            <p className="typography-body-default-16px-regular">
              Email <TextLink href={`mailto:${contact.securityEmail}`}>{contact.securityEmail}</TextLink> with the page,
              the time, and enough detail to reproduce the issue. Please avoid sending Fanvue access tokens or fan data
              in the first message.
            </p>
            {contact.securityIsPlaceholder ? (
              <Alert variant="error">Replace SECURITY_EMAIL before submission. security@example.com is a placeholder.</Alert>
            ) : null}
            <p className="typography-body-default-16px-regular">
              The app stores Fanvue tokens encrypted on the server, requests read scopes only, and verifies Fanvue webhook
              signatures before it stores an event.
            </p>
            <p className="typography-body-small-14px-regular text-content-secondary">
              This contact is for the app operator named on the privacy page, not for Fanvue the platform.
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
