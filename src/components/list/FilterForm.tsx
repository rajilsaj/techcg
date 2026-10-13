"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/** Values that are the defaults and so stay out of the URL. */
const DEFAULTS: Record<string, string> = { tri: "recents" };

/**
 * The homepage filter form. Without JavaScript it's a plain GET form; with it,
 * empty and default values are left out of the URL (/?sujet=ia rather than
 * /?q=&sujet=ia&periode=&tri=recents).
 */
export function FilterForm({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();

  return (
    <form
      action="/"
      method="get"
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget)) {
          const v = String(value).trim();
          if (v && DEFAULTS[key] !== v) params.set(key, v);
        }
        const query = params.toString();
        router.push(query ? `/?${query}` : "/");
      }}
    >
      {children}
    </form>
  );
}

/**
 * A select that reads as a word in a sentence: as wide as its chosen option
 * (a native select is as wide as its longest one) and applied as soon as it changes.
 */
export function SentenceSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  const [value, setValue] = useState(defaultValue);
  const measure = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();
  const chosen = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "";

  useLayoutEffect(() => {
    if (measure.current) setWidth(measure.current.offsetWidth + 1);
  }, [chosen]);

  return (
    <span className="relative inline-block">
      <span ref={measure} aria-hidden className="invisible absolute left-0 top-0 whitespace-pre font-bold">
        {chosen}
      </span>
      <select
        name={name}
        aria-label={label}
        value={value}
        style={width ? { width } : undefined}
        onChange={(event) => {
          setValue(event.target.value);
          event.target.form?.requestSubmit();
        }}
        className="sentence-select cursor-pointer appearance-none rounded-none border-0 border-b-2 border-dotted border-accent/60 bg-transparent p-0 font-bold text-accent hover:border-solid focus:border-solid focus:outline-none focus:ring-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-bg text-base font-normal text-text">
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}
