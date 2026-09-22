"use client";

import { useState } from "react";

export function ContentActions({ itemId }: { itemId: number }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer cet élément ?")) return;

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
        alert("Échec de la suppression");
      }
    } catch (error) {
      alert("Erreur lors de la suppression");
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
        alert("Échec de l'effacement des signalements");
      }
    } catch (error) {
      alert("Erreur lors de l'effacement des signalements");
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
        {loading ? "…" : "Effacer les signalements"}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition disabled:opacity-50"
      >
        {loading ? "…" : "Supprimer"}
      </button>
    </div>
  );
}
