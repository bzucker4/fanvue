import Link from "next/link";
import { APP_STORE_HOME, appStoreListingUrl, readFanvueConfig } from "@/lib/fanvue/config";
import { LiveThumb } from "./live-thumb";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="mark" aria-hidden="true" />
      <span className="brand-name">Bundle Audit</span>
    </Link>
  );
}

export function AppStoreLink({ className }: { className?: string }) {
  const config = readFanvueConfig();
  const href = appStoreListingUrl(config.appUuid);
  const label = config.appUuid ? "Fanvue App Store listing" : "Fanvue App Store";
  return (
    <a className={className} href={href}>
      {label}
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <nav className="nav-links" aria-label="Primary">
        <AppStoreLink />
        <Link href="/support">Support</Link>
        <Link href="/connect">Connect</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Bundle Audit is an independent app. It is not affiliated with, endorsed by, or produced by Fanvue.</p>
      <nav className="footer-links" aria-label="Legal">
        <a href={APP_STORE_HOME}>Fanvue App Store</a>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/support">Support</Link>
        <Link href="/security">Security</Link>
      </nav>
    </footer>
  );
}

export function DraftBanner() {
  return (
    <p className="draft-banner">
      <strong>Owner and counsel must complete this page before submission.</strong> The text below is a draft for the
      app owner and their lawyer. It is not legal advice and it is not a finished policy.
    </p>
  );
}

const STATUS_CLASS: Record<string, string> = {
  confirmed_purchase_overlap: "confirmed",
  possible_duplicate_requiring_review: "possible",
  no_known_purchase_overlap: "clear",
  incomplete_or_unsupported_history: "incomplete",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={`pill ${STATUS_CLASS[status] ?? "neutral"}`}>{label}</span>;
}

export function PhotoFace({
  src,
  label,
  liveUploadId,
}: {
  src?: string | null;
  label: string;
  liveUploadId?: string | null;
}) {
  if (src) return <img className="shot" src={src} alt="" />;
  if (liveUploadId) return <LiveThumb uploadId={liveUploadId} label={label} />;
  return (
    <div className="thumb-fallback" aria-hidden="true">
      {label.slice(0, 1)}
    </div>
  );
}
