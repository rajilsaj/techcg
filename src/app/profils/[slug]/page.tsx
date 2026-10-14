import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PROFILE_COUNTRIES, isProfileCountry, profileInitials } from "@/lib/profiles";
import { ProfilePhoto } from "@/components/profiles/ProfilePhoto";
import { ProfilesBar } from "@/components/profiles/ProfilesBar";
import { ShareButton } from "@/components/ui/ShareButton";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

const getProfile = cache((slug: string) => prisma.profile.findUnique({ where: { slug } }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const profile = await getProfile((await params).slug);
  if (!profile || !profile.published) return { title: "Profiles.CG" };
  return { title: `${profile.name} · Profiles.CG`, description: [profile.role, profile.organization].filter(Boolean).join(", ") };
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const [profile, session] = await Promise.all([getProfile((await params).slug), getSession()]);
  // Hidden profiles: admins can still preview them.
  if (!profile || (!profile.published && !session?.isAdmin)) notFound();

  const links = [
    { href: profile.website, label: t("profiles.website") },
    { href: profile.linkedin, label: "LinkedIn" },
    { href: profile.twitter, label: "X" },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));
  const place = [profile.city, isProfileCountry(profile.country) ? PROFILE_COUNTRIES[profile.country] : null].filter(Boolean).join(", ");

  return (
    <>
      <ProfilesBar />
      <article className="px-5 sm:px-8 lg:px-12 2xl:px-16 pb-16 pt-6 sm:pt-10">
        <Link href="/profils" className="text-sm text-text-secondary hover:text-accent">
          ← {t("profiles.back")}
        </Link>
        {!profile.published && (
          <p className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-text">{t("profiles.unpublished")}</p>
        )}
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20">
          <ProfilePhoto
            src={profile.photoUrl}
            initials={profileInitials(profile.name)}
            alt={profile.name}
            textClass="text-7xl"
            className="mx-auto aspect-[4/5] w-full max-w-[16rem] rounded-sm shadow-xl sm:max-w-sm md:mx-0 md:max-w-none"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm text-text-secondary">
              <span aria-hidden>(</span>
              {[profile.role, profile.organization].filter(Boolean).join(" · ") || t("profiles.profile")}
              <span aria-hidden>)</span>
            </p>
            <h1 className="mt-2 break-words text-5xl font-medium leading-none tracking-tight text-text sm:text-6xl lg:text-8xl">{profile.name}</h1>
            {place && <p className="mt-3 text-text-secondary">{place}</p>}
            {profile.bio && <p className="mt-6 max-w-3xl whitespace-pre-line text-base leading-relaxed text-text lg:text-lg">{profile.bio}</p>}
            <ul className="mt-6 flex flex-wrap gap-2">
              <li>
                <ShareButton
                  path={`/profils/${profile.slug}`}
                  title={`${profile.name} · Profiles.CG`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-text px-4 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
                />
              </li>
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex rounded-full border border-border px-4 py-1.5 text-sm text-text transition-colors hover:border-accent hover:text-accent"
                    >
                      {l.label} ↗
                    </a>
                  </li>
                ))}
            </ul>
            {session?.isAdmin && (
              <Link href={`/godmod/profils/${profile.id}`} className="mt-8 inline-block text-sm text-accent hover:underline">
                {t("profiles.edit")}
              </Link>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
