"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitStoryAction } from "@/app/api/actions/submit";
import { t } from "@/i18n";

const fieldClass =
  "w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

/** Opens a free-topic conversation (a question post) and goes straight into it. */
export function NewDiscussionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || !text.trim()) return;
        setBusy(true);
        setError("");
        const result = await submitStoryAction("ask", title, "", text);
        if (result.error || !result.itemId) {
          setError(result.error ?? "");
          setBusy(false);
          return;
        }
        router.push(`/discussions/${result.itemId}`);
      }}
    >
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-secondary">{t("discussions.subject")}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder={t("discussions.subjectPlaceholder")} className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-secondary">{t("discussions.firstMessage")}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={5}
          maxLength={10000}
          placeholder={t("discussions.firstMessagePlaceholder")}
          className={`${fieldClass} resize-y`}
        />
      </label>
      <button
        type="submit"
        disabled={busy || !title.trim() || !text.trim()}
        className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? t("discussions.opening") : t("discussions.open")}
      </button>
    </form>
  );
}
