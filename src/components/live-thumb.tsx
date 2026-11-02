"use client";

import { Loader, Skeleton } from "@fanvue/ui";
import { useEffect, useState } from "react";

export function LiveThumb({ uploadId, label, className }: { uploadId: string; label: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState("Loading preview");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/media-preview?uploadId=${encodeURIComponent(uploadId)}`)
      .then(async (response) => {
        const body = (await response.json()) as { url?: string; message?: string };
        if (cancelled) return;
        if (body.url) setUrl(body.url);
        else setNote(body.message || "Preview unavailable");
      })
      .catch(() => {
        if (!cancelled) setNote("Preview unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [uploadId]);

  const frame = className ?? "aspect-[4/5] w-full rounded-sm bg-surface-secondary object-cover";
  if (url) return <img className={frame} src={url} alt="" />;
  if (note === "Loading preview") {
    return (
      <div className={`${frame} relative overflow-hidden`} role="status" aria-label={`Loading preview for ${label}`}>
        <Skeleton variant="rounded" width="100%" height="100%" />
        <Loader center minHeight={120} ariaLabel={`Loading preview for ${label}`} />
      </div>
    );
  }
  return (
    <div className={`${frame} typography-description-12px-regular grid place-items-center p-3 text-center text-content-secondary`} role="img" aria-label={note}>
      {note}
    </div>
  );
}
