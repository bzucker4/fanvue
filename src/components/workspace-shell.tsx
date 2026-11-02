import { Alert, Button, FolderIcon, ImageIcon, LinkIcon, SettingsIcon, Stepper } from "@fanvue/ui";
import NextLink from "next/link";
import { Brand } from "./chrome";
import { WorkspaceMobileNav } from "./workspace-nav";

const LINKS = [
  { href: "/workspace/connection", label: "Connection", icon: LinkIcon },
  { href: "/workspace/library", label: "Library", icon: ImageIcon },
  { href: "/workspace/bundles", label: "Bundles", icon: FolderIcon },
  { href: "/workspace/settings", label: "Settings", icon: SettingsIcon },
] as const;

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
    <>
      <div className="mx-auto grid w-full max-w-[1180px] gap-4 px-4 pt-4 pb-28 md:grid-cols-[240px_1fr] md:pb-8">
        <aside className="sticky top-4 hidden self-start rounded-md border border-border-primary bg-surface-primary p-4 md:block">
          <Brand href="/workspace/connection" />
          <p className="typography-body-small-14px-regular mt-3 text-content-secondary">{displayName}</p>
          <nav className="mt-4 flex flex-col gap-2" aria-label="Workspace">
            {LINKS.map((link) => {
              const Icon = link.icon;
              const selected = current === link.href;
              return (
                <Button key={link.href} asChild variant={selected ? "primary" : "tertiary"} size="40" fullWidth leftIcon={<Icon size={16} filled={selected} />}>
                  <NextLink href={link.href} aria-current={selected ? "page" : undefined}>
                    {link.label}
                  </NextLink>
                </Button>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          {mode === "demo" ? (
            <Alert variant="warning" title="Demo mode">
              These are harmless sample still lifes in a workspace of their own. They are not your Fanvue account, and
              live results are never filled in with this sample.
            </Alert>
          ) : (
            <Alert variant="info" title="Live workspace">
              Purchase evidence comes only from your Fanvue connection. If a sync has not finished, the audit says the
              history is incomplete.
            </Alert>
          )}
          {children}
        </div>
      </div>
      <WorkspaceMobileNav current={current} />
    </>
  );
}

const BUNDLE_STEPS = [
  { key: "photos", title: "Photos" },
  { key: "audience", title: "Audience" },
  { key: "audit", title: "Audit" },
] as const;

export function BundleSteps({ id, current }: { id: string; current: "photos" | "audience" | "audit" }) {
  const activeStep = BUNDLE_STEPS.findIndex((step) => step.key === current);
  const hrefs = {
    photos: `/workspace/bundles/${id}`,
    audience: `/workspace/bundles/${id}/audience`,
    audit: `/workspace/bundles/${id}/audit`,
  };
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <Stepper
        aria-hidden="true"
        size="sm"
        activeStep={activeStep}
        steps={BUNDLE_STEPS.map((step) => ({ title: step.title }))}
      />
      <nav className="flex flex-wrap gap-2" aria-label="Bundle steps">
        {BUNDLE_STEPS.map((step, index) => (
          <Button key={step.key} asChild variant={index === activeStep ? "primary" : index < activeStep ? "secondary" : "tertiary"} size="32">
            <NextLink href={hrefs[step.key]} aria-current={index === activeStep ? "step" : undefined}>
              {step.title}
            </NextLink>
          </Button>
        ))}
      </nav>
    </div>
  );
}
