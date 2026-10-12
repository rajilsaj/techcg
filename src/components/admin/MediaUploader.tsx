"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

type Status = { name: string; state: "uploading" | "done" | "error"; message?: string };

/** Drop zone / file picker that uploads images one by one to /api/medias. */
export function MediaUploader({ maxBytes, types }: { maxBytes: number; types: readonly string[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>([]);

  const uploadAll = async (files: File[]) => {
    if (files.length === 0) return;
    setStatuses(files.map((f) => ({ name: f.name, state: "uploading" })));
    for (const [i, file] of files.entries()) {
      const set = (s: Partial<Status>) => setStatuses((all) => all.map((x, j) => (j === i ? { ...x, ...s } : x)));
      if (!types.includes(file.type)) {
        set({ state: "error", message: "format non pris en charge" });
        continue;
      }
      if (file.size > maxBytes) {
        set({ state: "error", message: "plus de 4 Mo" });
        continue;
      }
      const body = new FormData();
      body.append("file", file);
      try {
        const res = await fetch("/api/medias", { method: "POST", body });
        if (res.ok) set({ state: "done" });
        else set({ state: "error", message: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `erreur ${res.status}` });
      } catch {
        set({ state: "error", message: "connexion interrompue" });
      }
    }
    router.refresh();
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          uploadAll([...e.dataTransfer.files]);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-border bg-bg"
        }`}
      >
        <Upload size={24} className="text-text-secondary" aria-hidden />
        <p className="text-sm text-text">Déposez des images ici</p>
        <p className="text-xs text-text-secondary">ou</p>
        <button type="button" onClick={() => input.current?.click()} className="rounded-md border border-accent px-4 py-1.5 text-sm font-medium text-accent hover:bg-accent hover:text-white">
          Choisir des fichiers
        </button>
        <p className="text-xs text-text-secondary">JPEG, PNG, WebP, GIF ou AVIF · 4 Mo maximum par image</p>
        <input
          ref={input}
          type="file"
          accept={types.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            uploadAll([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>

      {statuses.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm" aria-live="polite">
          {statuses.map((s, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="truncate text-text">{s.name}</span>
              <span className={s.state === "error" ? "text-red-500" : s.state === "done" ? "text-green-600" : "text-text-secondary"}>
                {s.state === "uploading" ? "Envoi…" : s.state === "done" ? "Ajoutée" : `Échec : ${s.message}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
