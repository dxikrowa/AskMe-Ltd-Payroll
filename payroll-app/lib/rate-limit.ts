/**
 * lib/rate-limit.ts
 *
 * In-memory sliding-window rate limiter.
 * For high-traffic production use, swap the store for an Upstash Redis adapter:
 *   https://github.com/upstash/ratelimit
 *
 * Usage:
 *   const limiter = new RateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });
 *   const { success } = await limiter.check(ip);
 */

interface Window {
  timestamps: number[];
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Max requests allowed within the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export class RateLimiter {
  private store = new Map<string, Window>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor({ limit, windowMs }: RateLimiterOptions) {
    this.limit = limit;
    this.windowMs = windowMs;

    // Periodically sweep expired entries to prevent memory leaks
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.sweep(), windowMs * 2);
    }
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    const win = this.store.get(key) ?? { timestamps: [] };
    // Discard timestamps outside the current window
    win.timestamps = win.timestamps.filter((t) => t > cutoff);
    win.timestamps.push(now);
    this.store.set(key, win);

    const count = win.timestamps.length;
    const success = count <= this.limit;
    const remaining = Math.max(0, this.limit - count);
    const oldest = win.timestamps[0] ?? now;
    const resetAt = oldest + this.windowMs;

    return { success, remaining, resetAt };
  }

  private sweep() {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, win] of this.store.entries()) {
      win.timestamps = win.timestamps.filter((t) => t > cutoff);
      if (win.timestamps.length === 0) this.store.delete(key);
    }
  }
}

// ─── Pre-configured limiters ────────────────────────────────────────────────

/** Strict: registration / password-reset (5 per 15 min per IP) */
export const authLimiter = new RateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

/** Login attempts (10 per 10 min per IP) */
export const loginLimiter = new RateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/** 2FA verification (5 per 10 min per userId) */
export const twoFaLimiter = new RateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

/** General API calls (100 per min per IP) */
export const apiLimiter = new RateLimiter({ limit: 100, windowMs: 60 * 1000 });

// ─── Helper to extract caller IP from a Request ──────────────────────────────

export function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── Helper to return a 429 response ─────────────────────────────────────────

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(resetAt),
      },
    }
  );
}
