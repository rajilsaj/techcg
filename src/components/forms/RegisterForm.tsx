"use client";

import { useState } from "react";
import { registerAction } from "@/app/api/actions/auth";

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await registerAction(username, password, confirmPassword);
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border rounded text-text"
          placeholder="alice"
          disabled={loading}
        />
        <p className="text-xs text-text-secondary mt-1">
          3-20 characters, letters/numbers/_ and - only
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border rounded text-text"
          placeholder="••••••••"
          disabled={loading}
        />
        <p className="text-xs text-text-secondary mt-1">
          At least 6 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border rounded text-text"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
