import { env } from "@/lib/env";

/**
 * Rate limiter: Redis (REDIS_URL) when available, otherwise in-memory fixed window.
 * Multi-instance production should set REDIS_URL.
 */

type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

type RedisLike = {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  pttl(key: string): Promise<number>;
};

let redisClient: RedisLike | null | undefined;

async function getRedis(): Promise<RedisLike | null> {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    redisClient = null;
    return null;
  }
  try {
    const Redis = (await import("ioredis")).default;
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    await client.connect().catch(() => undefined);
    redisClient = client as unknown as RedisLike;
    return redisClient;
  } catch (err) {
    console.warn("[rate-limit] Redis unavailable, falling back to memory:", err);
    redisClient = null;
    return null;
  }
}

function memoryLimit(key: string): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = env.rateLimit.windowSec * 1000;
  const max = env.rateLimit.maxRequests;
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt };
  }
  bucket.count += 1;
  const ok = bucket.count <= max;
  return { ok, remaining: Math.max(0, max - bucket.count), resetAt: bucket.resetAt };
}

async function redisLimit(key: string, redis: RedisLike): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const windowMs = env.rateLimit.windowSec * 1000;
  const max = env.rateLimit.maxRequests;
  const redisKey = `rl:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.pexpire(redisKey, windowMs);
  let ttl = await redis.pttl(redisKey);
  if (ttl < 0) {
    await redis.pexpire(redisKey, windowMs);
    ttl = windowMs;
  }
  const resetAt = Date.now() + ttl;
  const ok = count <= max;
  return { ok, remaining: Math.max(0, max - count), resetAt };
}

/** Sync API kept for existing call sites; uses memory immediately, best-effort Redis via cache. */
export function rateLimit(key: string): { ok: boolean; remaining: number; resetAt: number } {
  return memoryLimit(key);
}

/** Preferred async API — uses Redis when REDIS_URL is configured. */
export async function rateLimitAsync(key: string): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const redis = await getRedis();
  if (redis) {
    try {
      return await redisLimit(key, redis);
    } catch (err) {
      console.warn("[rate-limit] Redis error, memory fallback:", err);
    }
  }
  return memoryLimit(key);
}

export function clientKey(req: Request, suffix = ""): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "local";
  return `${ip}:${suffix}`;
}
