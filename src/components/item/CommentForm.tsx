"use client";

import { useState } from "react";
import Link from "next/link";
import { LockKeyhole, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitCommentAction } from "@/app/api/actions/comment";
import { t } from "@/i18n";

export interface CommentFormProps {
  itemId: number;
  isLoggedIn: boolean;
}

export function CommentForm({ itemId, isLoggedIn }: CommentFormProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const router = useRouter();

  if (!isLoggedIn) {
    return <CommentInvite itemId={itemId} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await submitCommentAction(itemId, text);
      if (result.error) {
        setError(result.error);
      } else {
        setText("");
        if (result.pending) setNotice(t("comment.pendingModeration"));
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border p-4">
      <h3 className="text-sm font-medium text-text mb-3">{t("comment.add")}</h3>

      {notice && (
        <div className="mb-3 rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-text" role="status">
          {notice}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm mb-3">
          {error}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("comment.placeholder")}
        className="w-full px-3 py-2 border border-border rounded text-text bg-bg resize-none"
        rows={4}
        disabled={loading}
      />

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? t("comment.posting") : t("comment.post")}
        </button>
      </div>
    </form>
  );
}

/**
 * Shown to visitors who aren't signed in: a faded comment box with a lock and
 * the sign-in button right beside it. Sign-in returns to the same article.
 */
function CommentInvite({ itemId }: { itemId: number }) {
  const next = encodeURIComponent(`/publication/${itemId}#commenter`);
  return (
    <section id="commenter" aria-labelledby="comment-invite-title" className="border-t border-border p-4">
      <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-bg-secondary/60">
        {/* The box as it will look once signed in, faded behind the invitation. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none p-4 opacity-40 blur-[1px]">
          <div className="mb-3 h-3 w-40 rounded-full bg-border" />
          <div className="h-[calc(100%-1.5rem)] rounded-lg border border-border bg-bg" />
        </div>
        <div className="relative flex min-h-[7.5rem] flex-col items-center justify-center gap-3 px-4 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-text text-bg shadow-sm">
              <LockKeyhole size={18} aria-hidden />
            </span>
            <div>
              <p id="comment-invite-title" className="text-sm font-semibold text-text">
                {t("comment.inviteTitle")}
              </p>
              <p className="text-xs text-text-secondary">{t("comment.inviteText")}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`/connexion?next=${next}`}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 hover:no-underline"
            >
              <MessageCircle size={16} aria-hidden />
              {t("comment.inviteLogin")}
            </Link>
            <Link href={`/inscription?next=${next}`} className="text-sm text-text-secondary underline-offset-2 hover:text-accent hover:underline">
              {t("comment.inviteRegister")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
