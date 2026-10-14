"use client";

import { useState } from "react";

/** A source's logo on a white tile (logos are drawn for light backgrounds); its initials if the logo can't load. */
export function SourceLogo({ src, name, className = "" }: { src: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(!src);
  const initials = name
    .split(/[\s.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (broken) {
    return (
      <div aria-hidden className={`grid place-items-center bg-gradient-to-br from-accent to-[#5b9bff] font-semibold text-white ${className}`}>
        {initials}
      </div>
    );
  }
  return (
    <div className={`grid place-items-center overflow-hidden border border-border bg-white p-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logos come from each source's own site */}
      <img src={src!} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-contain" />
    </div>
  );
}
