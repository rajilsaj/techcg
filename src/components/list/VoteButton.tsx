"use client";

import { ChevronUp } from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toggleVoteAction } from "@/app/api/actions/vote";
import { useT } from "@/i18n/client";

export interface VoteButtonProps {
  itemId: number;
  isVoted?: boolean;
  isLoggedIn?: boolean;
}

export function VoteButton({ itemId, isVoted = false, isLoggedIn = false }: VoteButtonProps) {
  const [voted, setVoted] = useState(isVoted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const t = useT();

  const handleVote = useCallback(async () => {
    if (loading) return;

    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await toggleVoteAction(itemId);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setVoted(!voted);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }, [itemId, voted, loading, isLoggedIn, router]);

  return (
    <>
      <button
        onClick={handleVote}
        disabled={loading}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          voted
            ? "text-accent bg-accent/10"
            : "text-text-secondary hover:text-accent hover:bg-accent/5"
        }`}
        aria-label={voted ? t("vote.unvote") : t("vote.upvote")}
        title={error || ""}
      >
        <ChevronUp
          size={16}
          fill={voted ? "currentColor" : "none"}
          strokeWidth={2}
        />
      </button>
      {error && (
        <div className="text-xs text-red-600" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
