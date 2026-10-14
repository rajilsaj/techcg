"use client";

import { useState, useTransition } from "react";
import { extractProfileAction } from "@/app/godmod/profils/actions";
import { buttonClass, inputClass } from "@/components/admin/ui";

const FIELDS = ["name", "role", "organization", "city", "country", "photoUrl", "bio", "website", "linkedin"] as const;

/**
 * "Remplir depuis un lien": reads a LinkedIn profile or website and fills the
 * profile form below with what it found. Nothing is saved until the form is.
 */
export function ProfileLinkFiller({ formId }: { formId: string }) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fill = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await extractProfileAction(url);
      if ("error" in result) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      const form = document.getElementById(formId) as HTMLFormElement | null;
      let filled = 0;
      for (const field of FIELDS) {
        const value = result.draft[field];
        const input = form?.elements.namedItem(field) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        if (value && input) {
          input.value = value;
          filled++;
        }
      }
      setPhoto(result.draft.photoUrl);
      setMessage({ ok: true, text: `${filled} champ(s) rempli(s). Vérifiez, complétez le rôle si besoin, puis enregistrez.` });
    });

  return (
    <div className="mb-4 rounded-lg border border-dashed border-border p-3">
      <label htmlFor={`${formId}-link`} className="mb-1 block text-xs font-medium text-text-secondary">
        Remplir depuis un lien (profil LinkedIn ou site web)
      </label>
      <div className="flex gap-2">
        <input
          id={`${formId}-link`}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (url.trim()) fill();
            }
          }}
          placeholder="https://www.linkedin.com/in/…"
          className={inputClass}
        />
        <button type="button" disabled={pending || !url.trim()} onClick={fill} className={`${buttonClass} shrink-0`}>
          {pending ? "Lecture…" : "Remplir"}
        </button>
      </div>
      {message && (
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {message.ok && photo && <img src={photo} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full object-cover" />}
          <p role="status" className={`text-xs ${message.ok ? "text-green-600" : "text-red-500"}`}>
            {message.text}
          </p>
        </div>
      )}
    </div>
  );
}
