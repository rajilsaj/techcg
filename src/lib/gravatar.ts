import { createHash } from "node:crypto";

/**
 * Gravatar image for a member. The address is hashed (SHA-256, as Gravatar asks)
 * on the server, so emails never reach the browser. Members without an email or
 * without a Gravatar get their initials on a generated colour.
 */
export function avatarUrl(email: string | null | undefined, username: string, size = 32): string {
  const key = email?.trim().toLowerCase() || `${username.toLowerCase()}@membres.techcg`;
  const hash = createHash("sha256").update(key).digest("hex");
  const params = new URLSearchParams({ s: String(size * 2), d: "initials", name: username, r: "pg" });
  return `https://gravatar.com/avatar/${hash}?${params}`;
}
