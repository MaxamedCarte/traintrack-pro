"use server";

import { connectDB } from "@/lib/db";
import { verifyCheckinToken } from "@/lib/qr-token";
import { rateLimit } from "@/lib/rate-limit";
import { Attendance, Staff, TrainingSession } from "@/models";
import { checkinSchema, fieldErrors, formToObject, type FormState } from "@/lib/validation";

const normalize = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

export type CheckinState = FormState & { name?: string; time?: string; already?: boolean };

/**
 * Public check-in. Every rule is enforced on the server: the signed token must be
 * valid, unexpired and current for a Live session; the staff ID and name must match
 * an active profile; and the unique index blocks duplicate submissions.
 */
export async function checkinAction(_: CheckinState, form: FormData): Promise<CheckinState> {
  const parsed = checkinSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  if (!(await rateLimit("checkin", 20, 10 * 60))) {
    return { ok: false, message: "Too many attempts from this device. Please ask the facilitator for help." };
  }

  const claims = await verifyCheckinToken(parsed.data.token);
  if (!claims) return { ok: false, message: "This QR code has expired. Scan the code currently on screen." };

  await connectDB();
  const session = await TrainingSession.findOne({ code: claims.sessionCode }).lean();
  if (!session || session.status !== "Live") return { ok: false, message: "This session is not accepting check-ins." };
  if ((session.qrVersion ?? 1) !== claims.version) return { ok: false, message: "This QR code was replaced. Scan the code currently on screen." };

  const staff = await Staff.findOne({ staffId: parsed.data.staffId, status: "active" }).lean();
  if (!staff || normalize(staff.fullName) !== normalize(parsed.data.fullName)) {
    return { ok: false, message: "We couldn't match that staff ID and name. Check both and try again." };
  }
  if (session.department && session.department !== "All departments" && staff.department !== session.department) {
    return { ok: false, message: `This session is for ${session.department}. Please speak with the facilitator.` };
  }

  const now = new Date();
  try {
    await Attendance.create({ sessionCode: session.code, staffId: staff.staffId, status: "Present", checkIn: now, method: "QR scan" });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      const existing = await Attendance.findOne({ sessionCode: session.code, staffId: staff.staffId }).lean();
      return { ok: true, already: true, name: staff.fullName, message: `You're already recorded as ${existing?.status ?? "checked in"}. Contact an administrator for corrections.` };
    }
    throw e;
  }
  return { ok: true, name: staff.fullName, time: now.toISOString(), message: "Attendance confirmed." };
}
