"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Checkbox that ticks every `name` checkbox in the same form (the table's "select all"). */
export function SelectAll({ name = "ids", label = "Tout sélectionner" }: { name?: string; label?: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="h-4 w-4 accent-[var(--accent)]"
      onChange={(e) => {
        const form = e.currentTarget.form;
        form?.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]`).forEach((box) => {
          box.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}

/**
 * Submit button that asks for confirmation first when `confirm` is set
 * (permanent deletions), and shows a pending state while the action runs.
 */
export function SubmitButton({
  children,
  confirm,
  className,
  name,
  value,
  formAction,
}: {
  children: ReactNode;
  confirm?: string;
  className?: string;
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
