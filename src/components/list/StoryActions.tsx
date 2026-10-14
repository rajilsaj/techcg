"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigDown, ArrowBigUp, EyeOff } from "lucide-react";
import { voteAction } from "@/app/api/actions/vote";
import { voteChange, type VoteValue } from "@/lib/vote-change";
import { setHiddenAction } from "@/app/api/actions/hide";
import { pluralize, t } from "@/i18n";

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

/** ▲ points ▼: upvote or downvote; the same arrow again removes the vote. */
export function VoteButtons({
  itemId,
  vote,
  points,
  isLoggedIn,
}: {
  itemId: number;
  vote: VoteValue;
  points: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({ vote, points });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const cast = (direction: 1 | -1) => {
    if (!isLoggedIn) return router.push("/connexion");
    const previous = state;
    const { next, delta } = voteChange(state.vote, direction);
    setState({ vote: next, points: state.points + delta }); // optimistic
    startTransition(async () => {
      const result = await voteAction(itemId, direction);
      if (result.error || result.vote === undefined || result.points === undefined) {
        setState(previous);
        setError(result.error ?? "");
      } else {
        setError("");
        setState({ vote: result.vote, points: result.points });
      }
    });
  };

  // Two separate buttons, grey at rest, solid black (white in dark mode) once chosen.
  const button =
    "grid h-8 w-9 place-items-center rounded-full transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg";
  const look = (on: boolean) =>
    on ? "bg-text text-bg shadow-sm" : "bg-bg-secondary text-text-secondary hover:bg-border hover:text-text";
  const up = look(state.vote === 1);
  const down = look(state.vote === -1);

  return (
    <>
      <div role="group" aria-label={t("vote.label")} className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          aria-pressed={state.vote === 1}
          aria-label={t("vote.up")}
          title={t("vote.up")}
          className={`${button} ${up}`}
          onClick={() => cast(1)}
        >
          <ArrowBigUp size={18} fill={state.vote === 1 ? "currentColor" : "none"} aria-hidden />
        </button>
        <span
          className="min-w-[2ch] text-center text-sm font-bold tabular-nums text-text"
          aria-live="polite"
          title={`${state.points} ${pluralize(state.points, t("unit.point"), t("unit.points"))}`}
        >
          {state.points}
        </span>
        <button
          type="button"
          disabled={pending}
          aria-pressed={state.vote === -1}
          aria-label={t("vote.down")}
          title={t("vote.down")}
          className={`${button} ${down}`}
          onClick={() => cast(-1)}
        >
          <ArrowBigDown size={18} fill={state.vote === -1 ? "currentColor" : "none"} aria-hidden />
        </button>
      </div>
      {error && (
        <span className="text-xs text-red-500" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
