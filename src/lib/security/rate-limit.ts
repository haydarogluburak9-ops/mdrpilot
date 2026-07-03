import { env } from "@/lib/env";

// Simple in-memory fixed-window rate limiter.
// For production / multi-instance, back this with Redis (REDIS_URL).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = env.rateLimit.windowSec * 1000;
  const max = env.rateLimit.maxRequests;

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt };
  }

  bucket.count += 1;
  const ok = bucket.count <= max;
  return { ok, remaining: Math.max(0, max - bucket.count), resetAt: bucket.resetAt };
}

export function clientKey(req: Request, suffix = ""): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "local";
  return `${ip}:${suffix}`;
}
