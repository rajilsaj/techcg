"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

interface OtpInputProps {
  length?: number;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  labelledBy: string;
  describedBy?: string;
}

/**
 * Six-cell OTP field. Remount (change `key`) to clear it.
 * Handles typing, backspace, arrow keys, paste and iOS/Android SMS autofill.
 */
export function OtpInput({
  length = 6,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus = true,
  labelledBy,
  describedBy,
}: OtpInputProps) {
  const [cells, setCells] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focusAt = (index: number) => {
    refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  };

  const update = (next: string[]) => {
    setCells(next);
    const code = next.join("");
    onChange?.(code);
    if (next.every(Boolean)) onComplete?.(code);
  };

  const handleChange = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "");
    const next = [...cells];

    if (!incoming) {
      next[index] = "";
      update(next);
      return;
    }

    // Distribute across cells so autofill/paste into one box fills them all.
    let cursor = index;
    for (const digit of incoming) {
      if (cursor >= length) break;
      next[cursor++] = digit;
    }
    update(next);
    focusAt(Math.min(cursor, length - 1));
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Backspace": {
        e.preventDefault();
        const next = [...cells];
        if (next[index]) {
          next[index] = "";
          update(next);
        } else if (index > 0) {
          next[index - 1] = "";
          update(next);
          focusAt(index - 1);
        }
        break;
      }
      case "Delete": {
        e.preventDefault();
        const next = [...cells];
        next[index] = "";
        update(next);
        break;
      }
      case "ArrowLeft":
        e.preventDefault();
        focusAt(index - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusAt(index + 1);
        break;
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    const next = Array(length).fill("");
    text.split("").forEach((digit, i) => (next[i] = digit));
    update(next);
    focusAt(Math.min(text.length, length - 1));
  };

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onPaste={handlePaste}
      className={`flex justify-between gap-2 ${invalid ? "auth-shake" : ""}`}
    >
      {cells.map((cell, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={cell}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Chiffre ${i + 1} sur ${length}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={`h-14 w-full max-w-[52px] rounded-xl border bg-bg text-center text-2xl font-semibold tabular-nums text-text caret-accent transition-all disabled:opacity-60 ${
            invalid ? "border-red-500" : cell ? "border-text-secondary/60" : "border-border"
          }`}
        />
      ))}
    </div>
  );
}
