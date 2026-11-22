import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const key = () => new TextEncoder().encode(env.authSecret);

export type CheckinClaims = { sessionCode: string; version: number; expiresAt: number };

/** Short-lived, signed, revocable check-in challenge bound to one session. */
export async function issueCheckinToken(sessionCode: string, version: number, minutes: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + minutes * 60;
  const token = await new SignJWT({ sid: sessionCode, v: version, typ: "checkin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());
  return { token, expiresAt: expiresAt * 1000 };
}

export async function verifyCheckinToken(token: string): Promise<CheckinClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.typ !== "checkin" || typeof payload.sid !== "string" || typeof payload.v !== "number") return null;
    return { sessionCode: payload.sid, version: payload.v, expiresAt: (payload.exp ?? 0) * 1000 };
  } catch {
    return null;
  }
}
