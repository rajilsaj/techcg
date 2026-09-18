/**
 * In-memory rate limiter using token bucket algorithm.
 * For v1, stores limits in memory. For v2+, use Redis.
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number; // Max tokens in bucket
  refillRate: number; // Tokens per second
  window: number; // Time window in seconds
}

const buckets = new Map<string, TokenBucket>();

const CONFIGS: Record<string, RateLimitConfig> = {
  submit: {
    maxTokens: 5, // 5 submissions per window
    refillRate: 5 / (60 * 60), // Per hour
    window: 60 * 60, // 1 hour
  },
  comment: {
    maxTokens: 30, // 30 comments per window
    refillRate: 30 / (60 * 60), // Per hour
    window: 60 * 60, // 1 hour
  },
};

export async function checkRateLimit(
  userId: number,
  action: "submit" | "comment"
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const config = CONFIGS[action];
  const key = `${action}:${userId}`;
  const now = Date.now() / 1000; // seconds

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: now,
    };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = elapsed * config.refillRate;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
    };
  }

  // Calculate when next token will be available
  const timeToNextToken = (1 - bucket.tokens) / config.refillRate;
  buckets.set(key, bucket);

  return {
    allowed: false,
    remaining: 0,
    retryAfter: Math.ceil(timeToNextToken),
  };
}

/**
 * Clean up old buckets periodically (every 10 min) to prevent memory leak
 */
setInterval(() => {
  const now = Date.now() / 1000;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > 24 * 60 * 60) {
      buckets.delete(key);
    }
  }
}, 10 * 60 * 1000);
