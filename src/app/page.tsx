import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { startDemo } from "./workspace/actions";

export default function HomePage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  return <Home searchParams={searchParams} />;
}

async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <SiteHeader />
      <main>
        {params.deleted === "1" ? (
          <p className="section notice ok">This workspace and its Fanvue tokens were deleted from Bundle Audit.</p>
        ) : null}
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">For Fanvue creators</span>
            <h1>See which photos in a bundle a fan has already bought.</h1>
            <p className="lede">
              Bundle Audit compares a proposed pay-per-view photo set with purchased chat attachments, including a
              photo you uploaded more than once. It keeps the upload, the photo itself, and the purchase as three
              different facts.
            </p>
            <p className="fine">
              Independent product. Not an official Fanvue app, and not affiliated with Fanvue. A result of “no known
              purchase overlap” does not mean a fan has never seen the photo.
            </p>
            <div className="actions">
              <form action={startDemo}>
                <button className="button" type="submit">
                  Open the sample audit
                </button>
              </form>
              <Link className="button-secondary" href="/connect">
                Connect Fanvue
              </Link>
              <a className="button-quiet" href="https://www.fanvue.com/app-store">
                Fanvue App Store
              </a>
            </div>
          </div>
          <aside className="hero-side" aria-label="Sample result">
            <p className="kicker">Sample result, after you confirm the reupload</p>
            <div className="mini-shot">
              <img src="/demo/notebook-reupload.svg" alt="" />
              <div>
                <strong>Linen notebook, second upload</strong>
                <div>
                  <span className="pill confirmed">Confirmed purchase overlap</span>
                </div>
                <p className="fine">Same photo as a notebook Jordan Hale already bought.</p>
              </div>
            </div>
            <div className="mini-shot">
              <img src="/demo/lamp.svg" alt="" />
              <div>
                <strong>Brass lamp</strong>
                <div>
                  <span className="pill confirmed">Confirmed purchase overlap</span>
                </div>
                <p className="fine">Paid attachment on the purchased message.</p>
              </div>
            </div>
            <div className="mini-shot">
              <img src="/demo/bowl.svg" alt="" />
              <div>
                <strong>Oak bowl</strong>
                <div>
                  <span className="pill clear">No known purchase overlap</span>
                </div>
                <p className="fine">No purchased attachment in the sample history.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="section grid-3">
          <article className="card">
            <div className="step-no">01</div>
            <h2>Import purchases</h2>
            <p>
              Connect with Fanvue OAuth, or explore a labeled demo. Live history is read per chat so broadcast
              purchases are included. Free previews stay separate from paid attachments.
            </p>
          </article>
          <article className="card">
            <div className="step-no">02</div>
            <h2>Review reuploads</h2>
            <p>
              A second upload keeps its own media ID. A resemblance can be suggested, and it stays a suggestion until
              you confirm it. Confirming one pair does not merge a chain of similar photos.
            </p>
          </article>
          <article className="card">
            <div className="step-no">03</div>
            <h2>Audit the bundle</h2>
            <p>
              Pick the photos and the fan, or a small audience. Each item comes back as a confirmed overlap, a
              duplicate to review, no known purchase, or incomplete history, with the message behind the warning.
            </p>
          </article>
        </section>

        <section className="section grid-2">
          <article className="card">
            <h2>What a warning is allowed to say</h2>
            <p>Confirmed overlap means a purchased PPV chat attachment matches this upload, or an upload you confirmed is the same photo.</p>
            <p>A refund or dispute is shown beside that purchase. It is not treated as proof the fan never received the photo.</p>
            <p>Sent messages are listed when they exist, and they are not counted as purchases.</p>
          </article>
          <article className="card">
            <h2>What this version does not do</h2>
            <p>It does not send messages, delete files, match video, identify fans across platforms, or train a model on creator data.</p>
            <p>It does not download Fanvue media to fingerprint it. Duplicate links are confirmed by you.</p>
            <p>Live audits are billed through Fanvue when you turn on a paid plan. This app does not run its own checkout.</p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
