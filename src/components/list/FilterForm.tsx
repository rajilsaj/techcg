"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/LoadingBar";

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
        const next = query ? `/?${query}` : "/";
        if (next !== `${location.pathname}${location.search}`) startNavigation();
        router.push(next);
      }}
    >
      {children}
    </form>
  );
}

/**
 * A choice that reads as a word in a sentence: the chosen option in blue, which
 * opens a small menu (title, options, check mark on the current one). Applies as
 * soon as an option is picked. Keyboard: arrows, Home/End, Enter, Esc.
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
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [alignRight, setAlignRight] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const chosen = options[selectedIndex]?.label ?? "";

  // Close on a click outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the menu on screen: open it to the left when it would overflow on the right.
  useLayoutEffect(() => {
    if (!open || !list.current) return;
    setAlignRight(false);
    const rect = list.current.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) setAlignRight(true);
    list.current.focus();
  }, [open]);

  const show = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const pick = (index: number) => {
    const option = options[index];
    close();
    if (!option || option.value === value) return;
    setValue(option.value);
    if (input.current) input.current.value = option.value;
    input.current?.form?.requestSubmit();
  };

  const onListKey = (event: React.KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(last, active + 1),
      ArrowUp: () => Math.max(0, active - 1),
      Home: () => 0,
      End: () => last,
    };
    if (moves[event.key]) {
      event.preventDefault();
      setActive(moves[event.key]());
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close(event.key === "Escape");
    }
  };

  return (
    <span ref={root} className="relative inline-block">
      <input ref={input} type="hidden" name={name} defaultValue={value} />
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label} : ${chosen}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
        className={`inline-flex items-baseline gap-1 rounded-sm border-b-2 font-bold text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
          open ? "border-solid border-accent" : "border-dotted border-accent/60 hover:border-solid"
        }`}
      >
        {chosen}
        <ChevronDown size={14} aria-hidden className={`translate-y-[-1px] self-center transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onListKey}
          className={`sentence-menu absolute top-full z-40 mt-2 min-w-[14rem] rounded-2xl border border-border bg-bg p-1.5 text-base font-normal shadow-xl shadow-black/10 focus:outline-none dark:shadow-black/40 ${
            alignRight ? "right-0" : "left-0"
          }`}
        >
          <li role="presentation" className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            {label}
          </li>
          {options.map((option, i) => {
            const selected = i === selectedIndex;
            return (
              <li
                key={option.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={`flex cursor-pointer items-center justify-between gap-6 rounded-xl px-3 py-2 text-[15px] leading-tight transition-colors ${
                  i === active ? "bg-accent/10" : ""
                } ${selected ? "font-semibold text-accent" : "text-text"}`}
              >
                <span className="first-letter:uppercase">{option.label}</span>
                {selected && <Check size={16} aria-hidden className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </span>
  );
}
