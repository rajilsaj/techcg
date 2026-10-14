"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";

type Fit = "pending" | "cover" | "contain" | "small" | "broken";

/** An image that hasn't answered by then (blocked or very slow host) shows the placeholder. */
const LOAD_TIMEOUT_MS = 10_000;

/**
 * Article image that always fills its frame nicely, whatever the source gives us:
 * - photos (landscape, large enough) cover the frame, cropped from the centre;
 * - logos, icons and square/small images are shown whole, centred over a blurred
 *   copy of themselves, instead of being zoomed in and cut off;
 * - a broken URL shows `fallback` (the topic's cover) or a neutral placeholder;
 * - with a `fallback`, a picture too small to be a cover (icon, logo) shows it too.
 * Size the frame with `className` (e.g. "h-20 w-36 rounded").
 */
export function CoverImage({
  src,
  alt = "",
  className = "",
  eager = false,
  fallback,
}: {
  src: string;
  alt?: string;
  className?: string;
  eager?: boolean;
  fallback?: ReactNode;
}) {
  const img = useRef<HTMLImageElement>(null);
  const [fit, setFit] = useState<Fit>("pending");

  const measure = (el: HTMLImageElement) => {
    const { naturalWidth: w, naturalHeight: h } = el;
    if (!w || !h) return setFit("broken");
    if (fallback && (w < 400 || h < 200)) return setFit("small");
    const ratio = w / h;
    // Logos and icons: small, square-ish, or portrait. Photos: wide enough to crop safely.
    setFit(w < 360 || (ratio > 0.75 && ratio < 1.33) || ratio < 0.75 ? "contain" : "cover");
  };

  // The image may finish loading before React attaches onLoad (cached images).
  useEffect(() => {
    const el = img.current;
    if (el?.complete) measure(el);
    const timer = setTimeout(() => setFit((current) => (current === "pending" ? "broken" : current)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measure only on mount / src change
  }, [src]);

  if ((fit === "broken" || fit === "small") && fallback) return <>{fallback}</>;
  if (fit === "broken") {
    return (
      <div className={`grid place-items-center bg-bg-secondary text-text-secondary ${className}`} aria-hidden={!alt}>
        <ImageOff size={18} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-bg-secondary ${fit === "pending" ? "animate-pulse" : ""} ${className}`}>
      {fit === "contain" && (
        // eslint-disable-next-line @next/next/no-img-element -- decorative blurred backdrop
        <img src={src} alt="" aria-hidden="true" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-xl" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party hosts */}
      <img
        ref={img}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={(e) => measure(e.currentTarget)}
        onError={() => setFit("broken")}
        className={`relative h-full w-full transition-opacity duration-300 ${fit === "pending" ? "opacity-0" : "opacity-100"} ${
          fit === "contain" ? "object-contain p-[12%] drop-shadow-sm" : "object-cover object-center"
        }`}
      />
    </div>
  );
}
