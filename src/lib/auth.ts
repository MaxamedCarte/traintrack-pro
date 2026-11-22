import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { env } from "./env";
import { connectDB } from "./db";
import { SESSION_COOKIE } from "./constants";
import { Admin } from "@/models";

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const key = () => new TextEncoder().encode(env.authSecret);

export type AdminSession = { id: string; email: string; name: string; role: string };

export async function createSessionToken(admin: AdminSession) {
  return new SignJWT({ email: admin.email, name: admin.name, role: admin.role, typ: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySessionToken(token?: string): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.typ !== "admin" || !payload.sub) return null;
    return { id: payload.sub, email: String(payload.email), name: String(payload.name), role: String(payload.role) };
  } catch {
    return null;
  }
}

export async function setSessionCookie(admin: AdminSession) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(admin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Server-side authorization gate used by every admin page and action. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

/**
 * Validates credentials. When the database has no administrators yet, the
 * ADMIN_EMAIL / ADMIN_PASSWORD environment pair bootstraps the first owner.
 */
export async function authenticate(email: string, password: string): Promise<AdminSession | null> {
  await connectDB();
  const normalized = email.trim().toLowerCase();
  let admin = await Admin.findOne({ email: normalized });

  if (!admin && (await Admin.estimatedDocumentCount()) === 0) {
    if (env.adminEmail && env.adminPassword && normalized === env.adminEmail && password === env.adminPassword) {
      admin = await Admin.create({
        email: normalized,
        name: "Administrator",
        passwordHash: await hashPassword(password),
        role: "owner",
      });
    }
  }

  if (!admin) {
    // Equalise timing with a dummy compare so unknown emails are not detectable.
    await bcrypt.compare(password, "$2b$12$C6UzMDM.H6dfI/f/IKcEeO2c7l0Vb0JpQ3dQm4n9x4b3k0f6Zr3Ie");
    return null;
  }
  if (!(await bcrypt.compare(password, admin.passwordHash))) return null;

  admin.lastLoginAt = new Date();
  await admin.save();
  return { id: String(admin._id), email: admin.email, name: admin.name, role: admin.role ?? "admin" };
}
