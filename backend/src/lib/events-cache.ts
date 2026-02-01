import { getRedis } from "./redis.js";

const EVENTS_KEY_PREFIX = "events:doctor:";
const EVENTS_KEYS_SET_PREFIX = "events:keys:doctor:";
const EVENTS_TTL_SEC = 5 * 60; // 5 minutes

function cacheKey(doctorId: string, start: string, end: string): string {
  return `${EVENTS_KEY_PREFIX}${doctorId}:${start}:${end}`;
}

function keysSetKey(doctorId: string): string {
  return `${EVENTS_KEYS_SET_PREFIX}${doctorId}`;
}

export type CachedEvent = {
  _id: unknown;
  doctor: unknown;
  patient: unknown;
  utcStartDateTime: Date | string;
  duration: number;
  title?: string | null;
  description?: string | null;
};

export type CachedEventsResponse = { events: CachedEvent[] };

export async function getCachedEvents(
  doctorId: string,
  start: string,
  end: string
): Promise<CachedEventsResponse | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(cacheKey(doctorId, start, end));
    if (!raw) return null;
    return JSON.parse(raw) as CachedEventsResponse;
  } catch {
    return null;
  }
}

export async function setCachedEvents(
  doctorId: string,
  start: string,
  end: string,
  data: CachedEventsResponse
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = cacheKey(doctorId, start, end);
    await redis.set(key, JSON.stringify(data), { EX: EVENTS_TTL_SEC });
    await redis.sAdd(keysSetKey(doctorId), key);
  } catch {
    // ignore cache write failure
  }
}

export async function invalidateDoctorEventsCache(doctorId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const keysSet = keysSetKey(doctorId);
    const keys = await redis.sMembers(keysSet);
    if (keys.length > 0) {
      await redis.del(keys);
      await redis.del(keysSet);
    }
  } catch {
    // ignore invalidation failure
  }
}
