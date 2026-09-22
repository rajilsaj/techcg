"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

export function ContentActions({ itemId }: { itemId: number }) {
  const t = useT();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(t("admin.content.confirmDelete"))) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/content/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert(t("admin.content.deleteFailed"));
      }
    } catch (error) {
      alert(t("admin.content.deleteError"));
    } finally {
      setLoading(false);
    }
  };

  const handleClearFlags = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/content/clear-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert(t("admin.content.clearFailed"));
      }
    } catch (error) {
      alert(t("admin.content.clearError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleClearFlags}
        disabled={loading}
        className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition disabled:opacity-50"
      >
        {loading ? "…" : t("admin.content.clearFlags")}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition disabled:opacity-50"
      >
        {loading ? "…" : t("admin.content.delete")}
      </button>
    </div>
  );
}
