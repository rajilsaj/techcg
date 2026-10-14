"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Share: the phone's native share sheet (installed app or mobile browser), else
 * copies the link. `path` is a site path ("/profils/…"); the full URL is built here.
 */
export function ShareButton({ path, title, className = "", label = "Partager" }: { path: string; title: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = new URL(path, location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  };

  return (
    <button type="button" onClick={share} className={className} aria-live="polite">
      {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
      <span>{copied ? "Lien copié" : label}</span>
    </button>
  );
}
