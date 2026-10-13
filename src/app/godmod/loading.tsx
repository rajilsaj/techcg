import { Spinner } from "@/components/admin/FormControls";

/** Shown inside the admin layout while the next admin page loads. */
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Chargement" className="animate-pulse">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-7 w-48 rounded bg-bg" />
        <Spinner className="text-accent" />
      </div>
      <div className="space-y-3">
        <div className="h-24 rounded-xl border border-border bg-bg" />
        <div className="h-64 rounded-xl border border-border bg-bg" />
      </div>
    </div>
  );
}
