import { TRPCError } from "@trpc/server";

/**
 * Fixed-window, in-process rate limiter. It protects shared upstream quotas (OpenRouteService)
 * from one busy account. Per instance only: with several web replicas, each enforces its own window.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }
    return;
  }
  if (current.count >= limit) {
    const seconds = Math.ceil((current.resetAt - now) / 1000);
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Slow down a little. Try again in ${seconds} s.` });
  }
  current.count += 1;
}
