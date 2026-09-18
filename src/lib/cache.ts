import { unstable_cache as cache } from "next/cache";

/**
 * Wrapper around Next.js unstable_cache for consistent cache behavior.
 * Tags allow granular invalidation without full cache busts.
 *
 * Usage:
 *   const cachedFn = withCache(
 *     async () => await db.query(...),
 *     { tags: ["stories"], revalidate: 30 }
 *   );
 */

export interface CacheOptions {
  tags?: string[];
  revalidate?: number; // seconds (default: 60)
}

export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions = {}
): T {
  const { tags = [], revalidate = 60 } = options;

  return cache(fn, tags, { revalidate }) as T;
}

/**
 * Revalidate a cache tag (clear all cached results with this tag).
 * Used after mutations (vote, new comment, new story).
 */

export { revalidateTag } from "next/cache";
