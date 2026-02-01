import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let client: ReturnType<typeof createClient> | null = null;

export async function connectRedis(): Promise<ReturnType<typeof createClient> | null> {
  try {
    const c = createClient({ url: REDIS_URL });
    c.on("error", (err) => console.error("Redis error:", err));
    await c.connect();
    client = c;
    console.log("Redis connected");
    return c;
  } catch (err) {
    console.error("Redis connection error:", err);
    return null;
  }
}

export function getRedis(): ReturnType<typeof createClient> | null {
  return client;
}
