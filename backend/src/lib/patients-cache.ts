import { getRedis } from "./redis.js";

const PATIENTS_KEY = "patients:list";
const TTL_SEC = 5 * 60; // 5 minutes

export type CachedPatient = {
  _id: unknown;
  name: string;
  email: string;
  timezone: string;
};

export type CachedPatientsResponse = { patients: CachedPatient[] };

export async function getCachedPatients(): Promise<CachedPatientsResponse | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(PATIENTS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPatientsResponse;
  } catch {
    return null;
  }
}

export async function setCachedPatients(
  data: CachedPatientsResponse
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(PATIENTS_KEY, JSON.stringify(data), { EX: TTL_SEC });
  } catch {
    // ignore cache write failure
  }
}

export async function invalidatePatientsCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(PATIENTS_KEY);
  } catch {
    // ignore invalidation failure
  }
}
