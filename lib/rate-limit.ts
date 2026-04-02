/**
 * Simple in-memory sliding window rate limiter.
 * Tracks request counts per key within a time window.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up entries older than 2x the window every 60 seconds
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
    if (entry.timestamps.length === 0) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => store.delete(key));
}, 60_000);

/**
 * Check if a request should be rate limited.
 * @param key Identifier (e.g., IP address or token)
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds (default 60s)
 * @returns true if the request should be rejected
 */
export function isRateLimited(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    return true; // Rate limited
  }

  entry.timestamps.push(now);
  return false;
}

/**
 * Extract a client identifier from a NextRequest.
 * Uses x-forwarded-for header or falls back to 'unknown'.
 */
export function getClientIp(request: { headers: Headers }): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
