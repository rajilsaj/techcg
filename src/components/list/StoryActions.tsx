"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, ThumbsUp } from "lucide-react";
import { toggleVoteAction } from "@/app/api/actions/vote";
import { setHiddenAction } from "@/app/api/actions/hide";
import { t } from "@/i18n";

const actionClass =
  "inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors disabled:opacity-50";

const HiddenContext = createContext<(hidden: boolean) => void>(() => {});

/** Wraps a story so its "Masquer" button can collapse it, with an undo link. */
export function HideableStory({ itemId, children }: { itemId: number; children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hidden) {
    return (
      <li className="flex items-center justify-between gap-4 border-b border-border py-4 text-sm text-text-secondary">
        <span>{t("story.hidden")}</span>
        <button
          type="button"
          disabled={pending}
          className="font-medium text-accent hover:underline disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              const result = await setHiddenAction(itemId, false);
              if (result.success) setHidden(false);
            })
          }
        >
          {t("story.undoHide")}
        </button>
      </li>
    );
  }

  return <HiddenContext.Provider value={setHidden}>{children}</HiddenContext.Provider>;
}

export function HideButton({ itemId, isLoggedIn }: { itemId: number; isLoggedIn: boolean }) {
  const setHidden = useContext(HiddenContext);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={actionClass}
      onClick={() => {
        if (!isLoggedIn) return router.push("/connexion");
        startTransition(async () => {
          const result = await setHiddenAction(itemId, true);
          if (result.success) setHidden(true);
        });
      }}
    >
      <EyeOff size={14} aria-hidden />
      {t("story.hide")}
    </button>
  );
}

export function LikeButton({ itemId, voted, isLoggedIn }: { itemId: number; voted: boolean; isLoggedIn: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(voted);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const like = () => {
    if (!isLoggedIn) return router.push("/connexion");
    startTransition(async () => {
      const result = await toggleVoteAction(itemId);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setError("");
        setLiked(!liked);
        router.refresh(); // points
      }
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-pressed={liked}
        className={`${actionClass} ${liked ? "text-accent" : ""}`}
        onClick={like}
      >
        <ThumbsUp size={14} fill={liked ? "currentColor" : "none"} aria-hidden />
        {liked ? t("story.liked") : t("story.like")}
      </button>
      {error && (
        <span className="text-xs text-red-500" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
