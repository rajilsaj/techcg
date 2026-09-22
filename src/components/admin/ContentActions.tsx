"use client";

import { useState } from "react";

export function ContentActions({ itemId }: { itemId: number }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;

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
        alert("Failed to delete item");
      }
    } catch (error) {
      alert("Error deleting item");
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
        alert("Failed to clear flags");
      }
    } catch (error) {
      alert("Error clearing flags");
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
        {loading ? "..." : "Clear Flags"}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition disabled:opacity-50"
      >
        {loading ? "..." : "Delete"}
      </button>
    </div>
  );
}
