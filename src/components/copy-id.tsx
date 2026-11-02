"use client";

import { CopyIcon, IconButton } from "@fanvue/ui";
import { useState } from "react";

export function shortenId(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function CopyId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="typography-body-small-14px-semibold text-content-primary">{label}</span>
      <span className="typography-body-small-14px-regular font-mono text-content-secondary">{shortenId(value)}</span>
      <IconButton
        type="button"
        variant="tertiary"
        size="32"
        aria-label={`Copy ${label}`}
        icon={<CopyIcon size={16} />}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      />
      {copied ? <span className="typography-description-12px-regular text-content-secondary">Copied</span> : null}
    </div>
  );
}
