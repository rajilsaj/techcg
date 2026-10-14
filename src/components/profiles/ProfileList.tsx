"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ProfilePhoto } from "./ProfilePhoto";

export interface ProfileRow {
  slug: string;
  name: string;
  role: string;
  organization: string | null;
  photo: string | null;
  initials: string;
}

/**
 * Numbered rows with big names. The row under the pointer (or keyboard focus)
 * turns dark and, on wide screens, its photo slides alongside it.
 */
export function ProfileList({ profiles, firstNumber = 1 }: { profiles: ProfileRow[]; firstNumber?: number }) {
  const [active, setActive] = useState(0);
  const [photoTop, setPhotoTop] = useState(0);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);

  // The photo follows the row but stays inside the list (a short list doesn't push it over the footer).
  const activate = (index: number) => {
    setActive(index);
    const row = rows.current[index];
    if (!row) return;
    const room = (box.current?.offsetHeight ?? 0) - (photo.current?.offsetHeight ?? 0);
    setPhotoTop(Math.max(0, Math.min(row.offsetTop - 8, room)));
  };

  const current = profiles[active];

  return (
    <div ref={box} className="relative md:min-h-[19rem] lg:min-h-[22rem]">
      {/* Floating photo (wide screens) */}
      {current && (
        <div
          ref={photo}
          aria-hidden
          className="pointer-events-none absolute left-[55%] z-10 hidden w-48 -translate-x-1/2 transition-[top] duration-300 ease-out md:block lg:w-60 2xl:w-72"
          style={{ top: photoTop }}
        >
          <ProfilePhoto
            key={current.slug}
            src={current.photo}
            initials={current.initials}
            textClass="text-6xl"
            className="profile-photo aspect-[4/5] w-full rounded-sm shadow-xl"
          />
        </div>
      )}

      <ol className="border-t border-border">
        {profiles.map((profile, i) => {
          const on = i === active;
          return (
            <li
              key={profile.slug}
              ref={(el) => {
                rows.current[i] = el;
              }}
              className="border-b border-border"
            >
              <Link
                href={`/profils/${profile.slug}`}
                onMouseEnter={() => activate(i)}
                onFocus={() => activate(i)}
                className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 py-3 hover:no-underline sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-6 sm:py-4 lg:py-5"
              >
                <span className="flex items-center gap-1.5 text-xs tabular-nums text-text-secondary">
                  <span aria-hidden>(</span>
                  <span className={on ? "text-text underline underline-offset-2" : ""}>{String(firstNumber + i).padStart(2, "0")}</span>
                  <span aria-hidden>)</span>
                </span>

                <span className="flex min-w-0 items-center gap-3">
                  <ProfilePhoto
                    src={profile.photo}
                    initials={profile.initials}
                    lazy
                    textClass="text-sm"
                    className="h-10 w-10 shrink-0 rounded-full md:hidden"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-2xl leading-tight tracking-tight transition-colors duration-200 sm:text-4xl lg:text-5xl 2xl:text-6xl ${
                        // Phones have no hover: names stay fully readable there.
                        on ? "text-text" : "text-text md:text-text-secondary/60 md:group-hover:text-text"
                      }`}
                    >
                      {profile.name}
                    </span>
                    <span className="block truncate text-xs text-text-secondary sm:hidden">
                      {[profile.role, profile.organization].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </span>

                <span className="hidden items-center gap-1.5 text-sm text-text-secondary sm:flex">
                  <span aria-hidden>(</span>
                  <span className={`max-w-[16rem] truncate lg:max-w-[24rem] lg:text-base ${on ? "text-text underline underline-offset-4" : ""}`}>
                    {[profile.role, profile.organization].filter(Boolean).join(" · ") || "Profil"}
                  </span>
                  <span aria-hidden>)</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
