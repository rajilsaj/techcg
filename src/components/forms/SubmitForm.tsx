"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitStoryAction } from "@/app/api/actions/submit";

export interface SubmitFormProps {
  defaultType?: string;
}

export function SubmitForm({ defaultType = "story" }: SubmitFormProps) {
  const router = useRouter();
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await submitStoryAction(type, title, url, text);
      if (result.error) {
        setError(result.error);
      } else if (result.success && result.itemId) {
        router.push(`/item/${result.itemId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasUrl = url.trim().length > 0;
  const hasText = text.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-border rounded text-text bg-bg"
        >
          <option value="story">Article</option>
          <option value="ask">Question</option>
          <option value="show">Vitrine</option>
          <option value="job">Emploi</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Titre
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border rounded text-text"
          placeholder="De quoi s'agit-il ?"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">
          URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded text-text"
          placeholder="https://example.com"
          disabled={loading}
        />
        <p className="text-xs text-text-secondary mt-1">
          Laissez vide pour publier un texte
        </p>
      </div>

      {/* Visual divider */}
      {type === "story" && (
        <div className="border-t border-border pt-6">
          <label className="block text-sm font-medium text-text mb-2">
            Texte
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded text-text resize-none"
            placeholder="Racontez (facultatif si une URL est fournie)"
            rows={6}
            disabled={loading}
          />
          <p className="text-xs text-text-secondary mt-1">
            Ajoutez un texte s&apos;il n&apos;y a pas d&apos;URL, ou les deux pour le contexte
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={loading}
          className="px-4 py-2 border border-border rounded font-medium hover:bg-bg-secondary transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Envoi…" : "Publier"}
        </button>
      </div>
    </form>
  );
}
