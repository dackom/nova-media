import { randomBytes } from "node:crypto";
import { getRedis } from "./redis.js";

const TTL_SEC = 60;
const PREFIX = "socket-token:";

const memoryTokens = new Map<
  string,
  { patientId: string; timeout: ReturnType<typeof setTimeout> }
>();
const TTL_MS = 60_000;

export function createSocketToken(patientId: string): string {
  const token = randomBytes(32).toString("hex");
  const redis = getRedis();

  if (redis) {
    redis.set(`${PREFIX}${token}`, patientId, { EX: TTL_SEC });
  } else {
    const existing = memoryTokens.get(token);
    if (existing) clearTimeout(existing.timeout);
    const timeout = setTimeout(() => memoryTokens.delete(token), TTL_MS);
    memoryTokens.set(token, { patientId, timeout });
  }

  return token;
}

export async function consumeSocketToken(token: string): Promise<string | null> {
  const redis = getRedis();

  if (redis) {
    try {
      const patientId = await redis.get(`${PREFIX}${token}`);
      if (!patientId) return null;
      await redis.del(`${PREFIX}${token}`);
      return patientId;
    } catch {
      return null;
    }
  }

  const entry = memoryTokens.get(token);
  if (!entry) return null;
  clearTimeout(entry.timeout);
  memoryTokens.delete(token);
  return entry.patientId;
}
