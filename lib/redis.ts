import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
let initialized = false;

function getRedis(): Redis | null {
  if (initialized) return redis;
  initialized = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  }
  return redis;
}

// In-memory fallback so caching works even without Upstash Redis configured.
// Lives for the lifetime of the server process (and warm serverless instances),
// which makes repeat searches and role switches near-instant.
const memStore = new Map<string, { value: unknown; expires: number }>();

function memGet<T>(key: string): T | null {
  const hit = memStore.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    memStore.delete(key);
    return null;
  }
  return hit.value as T;
}

function memSet<T>(key: string, value: T, ttlSeconds: number): void {
  memStore.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

/** Read a cached value. Falls back to an in-memory cache when Redis is absent. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return memGet<T>(key);
  try {
    return (await r.get<T>(key)) ?? null;
  } catch {
    return memGet<T>(key);
  }
}

/** Write a cached value with a TTL (seconds). Uses in-memory cache without Redis. */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const r = getRedis();
  if (!r) {
    memSet(key, value, ttlSeconds);
    return;
  }
  try {
    await r.set(key, value, { ex: ttlSeconds });
  } catch {
    memSet(key, value, ttlSeconds);
  }
}

export const CACHE_TTL = {
  default: 7200, // 2 hours
  govt: 3600, // 1 hour
} as const;
