"use client";

import { useEffect, useState } from "react";

export function LiveThumb({ uploadId, label }: { uploadId: string; label: string }) {
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

  if (url) return <img className="shot" src={url} alt="" />;
  return (
    <div className="thumb-fallback" role="img" aria-label={note}>
      <span style={{ fontSize: "0.95rem", padding: "0.6rem", textAlign: "center" }}>{label.slice(0, 1)}</span>
    </div>
  );
}
