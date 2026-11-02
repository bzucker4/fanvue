import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/chrome";
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
};

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const config = readFanvueConfig();
  const ready = liveCredentialsReady(config);
  const error = params.error ? ERRORS[params.error] ?? "The connection could not be completed." : null;

  return (
    <>
      <SiteHeader />
      <main className="section" style={{ display: "grid", gap: "1rem" }}>
        <div className="page-head">
          <div>
            <p className="kicker">Connection</p>
            <h1 style={{ fontSize: "2.6rem" }}>Connect a creator account</h1>
            <p className="lede">OAuth stays on Fanvue. Bundle Audit never asks for a Fanvue password.</p>
          </div>
        </div>
        {error ? <p className="notice error">{error}</p> : null}
        <section className="grid-2">
          <article className="card stack">
            <h2>Live Fanvue</h2>
            <p>
              Status: {ready ? "credentials are present on the server" : "credentials are missing"}. Missing credentials
              do not switch this screen into the sample workspace.
            </p>
            <p className="fine">Scopes requested: {REQUIRED_SCOPES.join(", ")}, plus openid, offline_access, and offline so refresh tokens can renew.</p>
            <p className="fine">Redirect: {config.redirectUri || "Set APP_ORIGIN or FANVUE_REDIRECT_URI."}</p>
            {ready ? (
              <a className="button" href="/api/oauth/start">
                Continue to Fanvue
              </a>
            ) : (
              <button className="button" type="button" disabled>
                Continue to Fanvue
              </button>
            )}
            <p className="fine">
              Paid live import uses a Fanvue plan. There is no external checkout. In development or test,{" "}
              FANVUE_VALIDATION_IMPORT=true imports only the Fanvue user ids listed in FANVUE_VALIDATION_CREATOR_IDS.
              Production ignores that flag. It never loads the sample workspace.
            </p>
          </article>
          <article className="card stack">
            <h2>Sample workspace</h2>
            <p>
              The demo uses still-life illustrations. Jordan Hale bought the vase, the notebook, and the lamp. The
              notebook was uploaded again. A proposed bundle contains the second notebook, the lamp, and an oak bowl.
            </p>
            <form action={startDemo}>
              <button className="button-secondary" type="submit">
                Open demo mode
              </button>
            </form>
            <p className="fine">
              <Link href="/">Back to the overview</Link>
            </p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
