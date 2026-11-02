import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@fanvue/ui";
import { SiteFooter, SiteHeader, StatusPill } from "@/components/chrome";
import { SubmitButton } from "@/components/submit-button";
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
          <div className="mx-auto w-full max-w-[1120px] px-4">
            <Alert variant="success">This workspace and its Fanvue tokens were deleted from Bundle Audit.</Alert>
          </div>
        ) : null}
        <section className="mx-auto grid w-full max-w-[1120px] gap-4 px-4 md:grid-cols-[1.2fr_0.8fr]">
          <Card hierarchy="primary" type="container">
            <CardContent className="flex flex-col gap-4 p-6">
              <p className="typography-description-12px-semibold text-brand-primary-default uppercase tracking-wide">
                For Fanvue creators
              </p>
              <h1 className="typography-header-heading-lg text-content-primary">
                See which photos in a bundle a fan has already bought.
              </h1>
              <p className="typography-body-default-16px-regular max-w-xl text-content-primary">
                Bundle Audit compares a proposed pay-per-view photo set with purchased chat attachments, including a
                photo you uploaded more than once. It keeps the upload, the photo itself, and the purchase as three
                different facts.
              </p>
              <p className="typography-body-small-14px-regular text-content-secondary">
                Independent product. Not an official Fanvue app, and not affiliated with Fanvue. A result of “no known
                purchase overlap” does not mean a fan has never seen the photo.
              </p>
              <div className="flex flex-wrap gap-3">
                <form action={startDemo}>
                  <SubmitButton variant="primary" size="48">
                    Open the sample audit
                  </SubmitButton>
                </form>
                <Button asChild variant="secondary" size="48">
                  <a href="/connect">Connect Fanvue</a>
                </Button>
                <Button asChild variant="tertiary" size="48">
                  <a href="https://www.fanvue.com/app-store">Fanvue App Store</a>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card hierarchy="secondary" type="container" aria-label="Sample result">
            <CardContent className="flex flex-col gap-3 p-4">
              <p className="typography-description-12px-semibold text-content-secondary uppercase tracking-wide">
                Sample result, after you confirm the reupload
              </p>
              <SampleRow src="/demo/notebook-reupload.svg" title="Linen notebook, second upload" status="confirmed_purchase_overlap" label="Confirmed purchase overlap" detail="Same photo as a notebook Jordan Hale already bought." />
              <SampleRow src="/demo/lamp.svg" title="Brass lamp" status="confirmed_purchase_overlap" label="Confirmed purchase overlap" detail="Paid attachment on the purchased message." />
              <SampleRow src="/demo/bowl.svg" title="Oak bowl" status="no_known_purchase_overlap" label="No known purchase overlap" detail="No purchased attachment in the sample history." />
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto grid w-full max-w-[1120px] gap-4 px-4 py-6 md:grid-cols-3">
          <StepCard number="01" title="Import purchases">
            Connect with Fanvue OAuth, or explore a labeled demo. Live history is read per chat so broadcast purchases
            are included. Free previews stay separate from paid attachments.
          </StepCard>
          <StepCard number="02" title="Review reuploads">
            A second upload keeps its own media ID. A resemblance can be suggested, and it stays a suggestion until you
            confirm it. Confirming one pair does not merge a chain of similar photos.
          </StepCard>
          <StepCard number="03" title="Audit the bundle">
            Pick the photos and the fan, or a small audience. Each item comes back as a confirmed overlap, a duplicate
            to review, no known purchase, or incomplete history, with the message behind the warning.
          </StepCard>
        </section>

        <section className="mx-auto grid w-full max-w-[1120px] gap-4 px-4 pb-8 lg:grid-cols-2">
          <Card hierarchy="primary" type="header-only">
            <CardHeader>
              <CardTitle>What a warning is allowed to say</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="flex flex-wrap items-center gap-2">
                <StatusPill status="confirmed_purchase_overlap" label="Confirmed purchase overlap" />
                <span className="typography-body-small-14px-regular">
                  Confirmed overlap means a purchased PPV chat attachment matches this upload, or an upload you confirmed
                  is the same photo.
                </span>
              </p>
              <p className="typography-body-small-14px-regular text-content-primary">
                A refund or dispute is shown beside that purchase. It is not treated as proof the fan never received the
                photo.
              </p>
              <p className="typography-body-small-14px-regular text-content-primary">
                Sent messages are listed when they exist, and they are not counted as purchases.
              </p>
              <p className="flex flex-wrap items-center gap-2">
                <StatusPill status="possible_duplicate_requiring_review" label="Possible duplicate requiring review" />
                <span className="typography-body-small-14px-regular">A possible duplicate is only a suggestion.</span>
              </p>
              <p className="flex flex-wrap items-center gap-2">
                <StatusPill status="no_known_purchase_overlap" label="No known purchase overlap" />
                <span className="typography-body-small-14px-regular">
                  No known purchase overlap is limited to the history that was synchronized.
                </span>
              </p>
              <p className="flex flex-wrap items-center gap-2">
                <StatusPill status="incomplete_or_unsupported_history" label="Incomplete or unsupported history" />
                <span className="typography-body-small-14px-regular">
                  Incomplete history means the absence of a match is not a finding.
                </span>
              </p>
            </CardContent>
          </Card>
          <Card hierarchy="primary" type="header-only">
            <CardHeader>
              <CardTitle>What this version does not do</CardTitle>
            </CardHeader>
            <CardContent className="typography-body-default-16px-regular flex flex-col gap-3 text-content-primary">
              <p>It does not send messages, delete files, match video, identify fans across platforms, or train a model on creator data.</p>
              <p>It does not download Fanvue media to fingerprint it. Duplicate links are confirmed by you.</p>
              <p>Live audits are billed through Fanvue when you turn on a paid plan. This app does not run its own checkout.</p>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SampleRow({
  src,
  title,
  status,
  label,
  detail,
}: {
  src: string;
  title: string;
  status: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="grid grid-cols-[72px_1fr] items-center gap-3 rounded-sm border border-border-primary bg-surface-primary p-2">
      <img className="h-[88px] w-[72px] rounded-xs bg-surface-secondary object-cover" src={src} alt="" />
      <div className="flex flex-col gap-1">
        <strong className="typography-body-small-14px-semibold">{title}</strong>
        <StatusPill status={status} label={label} />
        <p className="typography-description-12px-regular text-content-secondary">{detail}</p>
      </div>
    </div>
  );
}

function StepCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <Card hierarchy="secondary" type="header-only">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="typography-header-heading-xs text-brand-primary-default">{number}</p>
        <p className="typography-body-small-14px-regular text-content-primary">{children}</p>
      </CardContent>
    </Card>
  );
}
