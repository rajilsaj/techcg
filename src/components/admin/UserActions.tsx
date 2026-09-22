"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

export function UserActions({
  userId,
  isShadowBanned,
}: {
  userId: number;
  isShadowBanned: boolean;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);

  const handleToggleShadowBan = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users/shadow-ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, shadowBan: !isShadowBanned }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert(t("admin.users.updateFailed"));
      }
    } catch (error) {
      alert(t("admin.users.updateError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 justify-end">
      <button
        onClick={handleToggleShadowBan}
        disabled={loading}
        className={`px-3 py-1 text-sm rounded font-medium transition ${
          isShadowBanned
            ? "bg-green-100 text-green-800 hover:bg-green-200"
            : "bg-red-100 text-red-800 hover:bg-red-200"
        } disabled:opacity-50`}
      >
        {loading ? "…" : isShadowBanned ? t("admin.users.unban") : t("admin.users.shadowBan")}
      </button>
    </div>
  );
}
