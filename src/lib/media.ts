/** Media library rules shared by the upload endpoint and the admin screen. */

export const MEDIA_MAX_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request body limit
export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;

/** Blob is connected when the project has a read-write token or an OIDC store id. */
export function isBlobConfigured(): boolean {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
