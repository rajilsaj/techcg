import { ProfilesBar } from "@/components/profiles/ProfilesBar";
import { t } from "@/i18n";

/** The Profiles.CG bar, branded « Tech.cg Discussions ». */
export function DiscussionsBar() {
  return (
    <ProfilesBar
      href="/discussions"
      brand={
        <>
          Tech.cg <span className="text-accent">{t("discussions.brand")}</span>
        </>
      }
    />
  );
}

/** Green pulsing dot: someone wrote in the last 24 hours. */
export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}
