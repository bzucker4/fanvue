import { Card, CardContent, CardHeader, CardTitle } from "@fanvue/ui";
import { PrimaryLink, SiteHeader } from "@/components/chrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-10">
        <Card hierarchy="primary" type="header-only">
          <CardHeader>
            <CardTitle>That page is not here</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="typography-body-default-16px-regular">
              The link may be old, or the bundle belongs to a different workspace.
            </p>
            <PrimaryLink href="/">Back to the start</PrimaryLink>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
