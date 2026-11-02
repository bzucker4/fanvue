import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@fanvue/ui";
import { PageIntro, QuietLink, SiteFooter, SiteHeader } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
import { liveCredentialsReady, readFanvueConfig, REQUIRED_SCOPES } from "@/lib/fanvue/config";
import { startDemo } from "../workspace/actions";

const ERRORS: Record<string, string> = {
  credentials: "Fanvue credentials are not configured. Add the client id, client secret, and encryption key on the server. Demo data will not be shown as a live result.",
  session: "SESSION_SECRET is missing or shorter than 32 characters, so a workspace session cannot be started.",
  denied: "Fanvue did not grant access. You can try the connection again.",
  state: "The sign-in attempt could not be verified. Start the connection again.",
  callback: "The return from Fanvue was incomplete.",
  scopes: "The Fanvue account did not grant every read scope this audit needs. Reconnect and accept read:self, read:chat, read:media, and read:creator.",
  exchange: "The Fanvue token exchange failed. Check the client secret and redirect URI, then try again.",
  expired: "This workspace session expired. Reconnect to Fanvue, or open the labeled sample again. The sample is not used in place of a live account.",
};

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const config = readFanvueConfig();
  const ready = liveCredentialsReady(config);
  const error = params.error ? ERRORS[params.error] ?? "The connection could not be completed." : null;
  const callbackMatches = !config.appOrigin || config.redirectUri === `${config.appOrigin}/api/oauth/callback`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10">
        <PageIntro kicker="Connection" title="Connect a creator account">
          <p className="typography-body-default-16px-regular text-content-primary">
            OAuth stays on Fanvue. Bundle Audit never asks for a Fanvue password.
          </p>
        </PageIntro>
        {error ? (
          <Alert variant="error" action={<a href="/support">Contact support</a>}>
            {error}
          </Alert>
        ) : null}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card hierarchy="primary" type="header-only">
            <CardHeader>
              <CardTitle>Live Fanvue</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="typography-body-default-16px-regular">
                Status: {ready ? "credentials are present on the server" : "credentials are missing"}. Missing credentials
                do not switch this screen into the sample workspace.
              </p>
              <p className="typography-body-small-14px-regular text-content-secondary">
                Scopes requested: {REQUIRED_SCOPES.join(", ")}, plus openid, offline_access, and offline so refresh tokens
                can renew.
              </p>
              <p className="typography-body-small-14px-regular break-all text-content-secondary">
                Redirect: {config.redirectUri || "Set APP_ORIGIN. Leave FANVUE_REDIRECT_URI empty."}
              </p>
              <p className="typography-body-small-14px-regular break-all text-content-secondary">
                Webhook: {config.appOrigin ? `${config.appOrigin}/api/webhooks/fanvue` : "Set APP_ORIGIN."}
              </p>
              {config.appOrigin && !callbackMatches ? (
                <Alert variant="error">
                  The OAuth callback is not exactly {config.appOrigin}/api/oauth/callback. Leave FANVUE_REDIRECT_URI empty
                  and register that URL.
                </Alert>
              ) : null}
              {ready ? (
                <Button asChild variant="primary" size="48">
                  <a href="/api/oauth/start">Continue to Fanvue</a>
                </Button>
              ) : (
                <Button variant="primary" size="48" type="button" disabled>
                  Continue to Fanvue
                </Button>
              )}
              <p className="typography-body-small-14px-regular text-content-secondary">
                Live import and live audit require an active Fanvue plan. Fanvue shows the price, limits, and taxes
                before payment. This app does not publish a price and does not add its own checkout. A failed connection
                stays on this screen. It does not open the sample workspace.
              </p>
            </CardContent>
          </Card>
          <Card hierarchy="primary" type="header-only">
            <CardHeader>
              <CardTitle>Sample workspace</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="typography-body-default-16px-regular">
                The demo uses still-life illustrations. Jordan Hale bought the vase, the notebook, and the lamp. The
                notebook was uploaded again. A proposed bundle contains the second notebook, the lamp, and an oak bowl.
              </p>
              <form action={startDemo}>
                <SubmitButton variant="secondary" size="40">
                  Open demo mode
                </SubmitButton>
              </form>
              <QuietLink href="/">Back to the overview</QuietLink>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
