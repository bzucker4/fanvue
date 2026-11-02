import {
  Alert,
  Button,
  Link as FanvueLink,
  Pill,
  type PillVariant,
} from "@fanvue/ui";
import NextLink from "next/link";
import { APP_STORE_HOME, appStoreListingUrl, readFanvueConfig } from "@/lib/fanvue/config";
import { LiveThumb } from "./live-thumb";
import { ThemeToggle } from "./theme-toggle";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <NextLink className="flex items-center gap-3 text-content-primary no-underline" href={href}>
      <span className="relative size-8 shrink-0 rounded-xs border border-content-primary bg-surface-primary" aria-hidden="true">
        <span className="absolute inset-1.5 rounded-3xs border border-brand-primary-default" />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-brand-primary-default" />
      </span>
      <span className="typography-body-default-16px-semibold">Bundle Audit</span>
    </NextLink>
  );
}

export function AppStoreLink() {
  const config = readFanvueConfig();
  const href = appStoreListingUrl(config.appUuid);
  const label = config.appUuid ? "Fanvue App Store listing" : "Fanvue App Store";
  return (
    <FanvueLink href={href} variant="primary" size="14">
      {label}
    </FanvueLink>
  );
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-4 py-5">
      <Brand />
      <div className="flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap items-center gap-4" aria-label="Primary">
          <AppStoreLink />
          <FanvueLink asChild variant="primary" size="14">
            <NextLink href="/support">Support</NextLink>
          </FanvueLink>
          <FanvueLink asChild variant="primary" size="14">
            <NextLink href="/connect">Connect</NextLink>
          </FanvueLink>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap items-start justify-between gap-4 px-4 py-8 text-content-secondary">
      <p className="typography-body-small-14px-regular max-w-xl">
        Bundle Audit is an independent app. It is not affiliated with, endorsed by, or produced by Fanvue.
      </p>
      <nav className="flex flex-wrap gap-4" aria-label="Legal">
        <FanvueLink href={APP_STORE_HOME} size="14">
          Fanvue App Store
        </FanvueLink>
        <FanvueLink asChild size="14">
          <NextLink href="/legal/privacy">Privacy</NextLink>
        </FanvueLink>
        <FanvueLink asChild size="14">
          <NextLink href="/legal/terms">Terms</NextLink>
        </FanvueLink>
        <FanvueLink asChild size="14">
          <NextLink href="/support">Support</NextLink>
        </FanvueLink>
        <FanvueLink asChild size="14">
          <NextLink href="/security">Security</NextLink>
        </FanvueLink>
      </nav>
    </footer>
  );
}

export function DraftBanner() {
  return (
    <Alert variant="warning" title="Owner and counsel must complete this page before submission.">
      The text below is a draft for the app owner and their lawyer. It is not legal advice and it is not a finished
      policy.
    </Alert>
  );
}

const STATUS_PILL: Record<string, PillVariant> = {
  confirmed_purchase_overlap: "red",
  possible_duplicate_requiring_review: "gold",
  no_known_purchase_overlap: "green",
  incomplete_or_unsupported_history: "blue",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <Pill className="text-content-primary" variant={STATUS_PILL[status] ?? "grey"}>
      {label}
    </Pill>
  );
}

export function PhotoFace({
  src,
  label,
  liveUploadId,
  className,
}: {
  src?: string | null;
  label: string;
  liveUploadId?: string | null;
  className?: string;
}) {
  const shot = className ?? "aspect-[4/5] w-full rounded-sm bg-surface-secondary object-cover";
  if (src) return <img className={shot} src={src} alt="" />;
  if (liveUploadId) return <LiveThumb uploadId={liveUploadId} label={label} className={shot} />;
  return (
    <div className={`${shot} typography-header-heading-xs grid place-items-center text-content-secondary`} aria-hidden="true">
      {label.slice(0, 1)}
    </div>
  );
}

export function PageIntro({
  kicker,
  title,
  children,
  action,
}: {
  kicker: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-3xl flex-col gap-2">
        <p className="typography-description-12px-semibold text-content-secondary uppercase tracking-wide">{kicker}</p>
        <h1 className="typography-header-heading-sm text-content-primary">{title}</h1>
        {children}
      </div>
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  if (external) {
    return (
      <FanvueLink href={href} size="14">
        {children}
      </FanvueLink>
    );
  }
  return (
    <FanvueLink asChild size="14">
      <NextLink href={href}>{children}</NextLink>
    </FanvueLink>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="primary" size="40">
      <NextLink href={href}>{children}</NextLink>
    </Button>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="secondary" size="40">
      <NextLink href={href}>{children}</NextLink>
    </Button>
  );
}

export function QuietLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <Button asChild variant="tertiary" size="40">
      {external ? <a href={href}>{children}</a> : <NextLink href={href}>{children}</NextLink>}
    </Button>
  );
}
