"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Small spinning ring, sized to the surrounding text. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-[1em] w-[1em] shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

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
 * Only the button that was clicked shows the spinner and `pendingLabel`.
 */
export function SubmitButton({
  children,
  confirm,
  className,
  name,
  value,
  formAction,
  pendingLabel,
}: {
  children: ReactNode;
  pendingLabel?: ReactNode;
  confirm?: string;
  className?: string;
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    if (!pending) setClicked(false);
  }, [pending]);
  const busy = pending && clicked;
  // When a button has its own formAction, React builds the FormData without the
  // button's name/value, so add them back before calling the action.
  const action =
    formAction && name
      ? (formData: FormData) => {
          formData.set(name, value ?? "");
          return formAction(formData);
        }
      : formAction;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={action}
      disabled={pending}
      aria-busy={busy}
      className={`${className ?? ""} ${busy ? "inline-flex items-center justify-center gap-2" : ""}`}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        else setClicked(true);
      }}
    >
      {busy && <Spinner />}
      {busy && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Corner notice shown while the surrounding form's action is running. */
export function PendingNotice({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text shadow-lg"
    >
      <Spinner className="text-accent" />
      <span>{children}</span>
    </div>
  );
}
