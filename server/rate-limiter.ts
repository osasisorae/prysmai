/**
 * In-memory IP-based rate limiter.
 *
 * Tracks request counts per IP within sliding time windows.
 * Designed for the demo scanner but generic enough for reuse.
 *
 * Note: In-memory store resets on server restart and is per-process.
 * For multi-process deployments, swap to a Redis-backed store.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Create a named rate limiter with the given config.
 * Returns a check function that accepts an IP and returns
 * { allowed, remaining, retryAfterMs }.
 */
export function createRateLimiter(name: string, config: RateLimiterConfig) {
  // Each limiter gets its own store keyed by name
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  // Periodic cleanup of expired entries (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const entries = Array.from(store.entries());
      for (let i = 0; i < entries.length; i++) {
        const [ip, entry] = entries[i];
        entry.timestamps = entry.timestamps.filter(
          (ts: number) => now - ts < config.windowMs
        );
        if (entry.timestamps.length === 0) {
          store.delete(ip);
        }
      }
  }, 5 * 60 * 1000);

  // Don't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    /**
     * Check if the given IP is allowed to make a request.
     * If allowed, the request is recorded.
     */
    check(ip: string): {
      allowed: boolean;
      remaining: number;
      retryAfterMs: number;
      limit: number;
    } {
      const now = Date.now();
      let entry = store.get(ip);

      if (!entry) {
        entry = { timestamps: [] };
        store.set(ip, entry);
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter(
        (ts) => now - ts < config.windowMs
      );

      if (entry.timestamps.length >= config.maxRequests) {
        // Rate limited — calculate when the oldest request in window expires
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = oldestInWindow + config.windowMs - now;
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, retryAfterMs),
          limit: config.maxRequests,
        };
      }

      // Allowed — record this request
      entry.timestamps.push(now);
      return {
        allowed: true,
        remaining: config.maxRequests - entry.timestamps.length,
        retryAfterMs: 0,
        limit: config.maxRequests,
      };
    },

    /** Reset the store (useful for testing) */
    reset() {
      store.clear();
    },

    /** Get current entry count (useful for monitoring) */
    get size() {
      return store.size;
    },
  };
}

/**
 * Extract client IP from an Express request.
 * Handles X-Forwarded-For for reverse proxies.
 */
export function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  // X-Forwarded-For may contain comma-separated list; take the first (client) IP
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    if (first) return first;
  }
  return req.ip ?? "unknown";
}
