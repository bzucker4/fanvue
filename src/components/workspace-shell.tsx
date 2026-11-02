import Link from "next/link";
import { Brand } from "./chrome";

const LINKS = [
  { href: "/workspace/connection", label: "Connection" },
  { href: "/workspace/library", label: "Library" },
  { href: "/workspace/bundles", label: "Bundles" },
  { href: "/workspace/settings", label: "Settings" },
];

export function WorkspaceShell({
  mode,
  displayName,
  current,
  children,
}: {
  mode: string;
  displayName: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <aside className="side">
        <Brand href="/workspace/connection" />
        <p className="fine" style={{ margin: "0.8rem 0 0" }}>
          {displayName}
        </p>
        <nav aria-label="Workspace">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="workspace-main">
        <div className={`banner ${mode === "demo" ? "demo" : "live"}`}>
          {mode === "demo" ? (
            <p style={{ margin: 0 }}>
              <strong>Demo mode.</strong> These are harmless sample still lifes in a workspace of their own. They are
              not your Fanvue account, and live results are never filled in with this sample.
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              <strong>Live workspace.</strong> Purchase evidence comes only from your Fanvue connection. If a sync has
              not finished, the audit says the history is incomplete.
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function BundleSteps({ id, current }: { id: string; current: "photos" | "audience" | "audit" }) {
  const steps = [
    ["photos", "Photos", `/workspace/bundles/${id}`],
    ["audience", "Audience", `/workspace/bundles/${id}/audience`],
    ["audit", "Audit", `/workspace/bundles/${id}/audit`],
  ] as const;
  return (
    <div className="steps" aria-label="Bundle steps">
      {steps.map(([key, label, href]) =>
        key === current ? (
          <span key={key} className="on">
            {label}
          </span>
        ) : (
          <Link key={key} href={href}>
            {label}
          </Link>
        ),
      )}
    </div>
  );
}
