"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Card } from "@/lib/storage";
import { buildShareUrl } from "@/lib/share";

export default function SharePanel({ card }: { card: Card }) {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Build the URL + QR on the client (needs window.location.origin).
  useEffect(() => {
    const shareUrl = buildShareUrl(window.location.origin, card);
    setUrl(shareUrl);
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
    QRCode.toDataURL(shareUrl, { margin: 1, width: 240 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [card]);

  const title = `${card.name} — a taste card`;

  async function nativeShare() {
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      // User cancelled or share failed — the fallback UI is already visible.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const empty = card.films.length === 0;
  // Rough guard: very long URLs make a dense, hard-to-scan QR.
  const dense = url.length > 1800;

  return (
    <section className="space-y-4 rounded-xl border border-line bg-surface/50 p-4">
      <h3 className="text-sm font-semibold text-fg">Share this card</h3>

      {empty ? (
        <p className="text-sm text-muted">
          Add at least one film to share this card.
        </p>
      ) : (
        <>
          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              className="w-full rounded-lg bg-fg py-2 text-sm font-semibold text-app transition-colors hover:opacity-90"
            >
              Share…
            </button>
          )}

          <div className="flex flex-col items-center gap-3">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="QR code for this card"
                className="rounded-lg bg-white p-2"
                width={200}
                height={200}
              />
            )}
            {dense && (
              <p className="text-center text-xs text-amber-400">
                This card is large — the QR is dense. Fewer films scan more
                reliably.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-line bg-app px-3 py-2 text-xs text-muted"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-medium text-fg transition-colors hover:border-muted"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
