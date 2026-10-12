"use client";

import { useState } from "react";
import Link from "next/link";

/** Image URL field with a preview and a grid to pick from the media library. */
export function ImagePicker({ name, defaultValue, media }: { name: string; defaultValue: string; media: { id: number; url: string; alt: string }[] }) {
  const [url, setUrl] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary hosts
        <img src={url} alt="" referrerPolicy="no-referrer" className="aspect-video w-full rounded-md border border-border object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-text-secondary">
          Aucune image
        </div>
      )}
      <input
        name={name}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        aria-label="Adresse de l'image"
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
      />
      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={() => setOpen(!open)} className="text-accent hover:underline">
          {open ? "Fermer la médiathèque" : "Choisir dans la médiathèque"}
        </button>
        {url && (
          <button type="button" onClick={() => setUrl("")} className="text-red-500 hover:underline">
            Retirer
          </button>
        )}
      </div>
      {open &&
        (media.length === 0 ? (
          <p className="text-xs text-text-secondary">
            La médiathèque est vide.{" "}
            <Link href="/godmod/medias" className="text-accent hover:underline">
              Ajouter des images
            </Link>
          </p>
        ) : (
          <ul className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
            {media.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setUrl(m.url);
                    setOpen(false);
                  }}
                  className={`block w-full overflow-hidden rounded border-2 ${url === m.url ? "border-accent" : "border-transparent hover:border-border"}`}
                  title={m.alt || "Choisir cette image"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Blob URLs */}
                  <img src={m.url} alt={m.alt} className="aspect-square w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
