"use server";

import { redirect } from "next/navigation";
import { authenticate, clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrors, formToObject, loginSchema, type FormState } from "@/lib/validation";

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  if (!(await rateLimit("login", 10, 15 * 60))) {
    return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }

  const admin = await authenticate(parsed.data.email, parsed.data.password);
  if (!admin) return { ok: false, message: "Incorrect email or password." };

  await setSessionCookie(admin);
  const next = String(form.get("next") || "/overview");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/overview");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
