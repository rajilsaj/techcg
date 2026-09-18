"use client";

import { useState } from "react";
import { submitCommentAction } from "@/app/api/actions/comment";

export interface CommentFormProps {
  itemId: number;
  isLoggedIn: boolean;
}

export function CommentForm({ itemId, isLoggedIn }: CommentFormProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  if (!isLoggedIn) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError("");

    try {
      const result = await submitCommentAction(itemId, text);
      if (result.error) {
        setError(result.error);
      } else {
        setText("");
        // Page will refresh via revalidateTag
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border p-4">
      <h3 className="text-sm font-medium text-text mb-3">Add a comment</h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm mb-3">
          {error}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your thoughts..."
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
          {loading ? "Posting..." : "Post Comment"}
        </button>
      </div>
    </form>
  );
}
