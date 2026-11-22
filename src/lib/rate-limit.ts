import "server-only";
import { headers } from "next/headers";
import { connectDB } from "./db";
import { RateLimit } from "@/models";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Fixed-window limiter stored in MongoDB so it works across serverless instances. */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number) {
  await connectDB();
  const key = `${bucket}:${await clientIp()}`;
  const now = new Date();
  const doc = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { returnDocument: "after" },
  );
  if (doc) return doc.count <= limit;
  await RateLimit.findOneAndUpdate(
    { key },
    { $set: { count: 1, expiresAt: new Date(now.getTime() + windowSeconds * 1000) } },
    { upsert: true },
  );
  return true;
}
