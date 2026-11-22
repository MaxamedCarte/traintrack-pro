"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { issueCheckinToken } from "@/lib/qr-token";
import { seedDemoData } from "@/lib/seed-data";
import { Admin, Attendance, Department, Settings, Staff, TrainingSession } from "@/models";
import {
  adminSchema,
  correctionSchema,
  departmentSchema,
  fieldErrors,
  formToObject,
  manualAttendanceSchema,
  passwordSchema,
  sessionSchema,
  settingsSchema,
  staffSchema,
  type FormState,
} from "@/lib/validation";
import { SESSION_STATUSES, type SessionStatus } from "@/lib/constants";

const isDuplicate = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

function refresh(...paths: string[]) {
  for (const p of ["/overview", ...paths]) revalidatePath(p);
}

/* ------------------------------------------------------------------ Staff */

export async function saveStaffAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = staffSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const original = String(form.get("original") || "");
  await connectDB();
  try {
    if (original) {
      const existing = await Staff.findOne({ staffId: original });
      if (!existing) return { ok: false, message: "Staff member not found." };
      const before = `${existing.fullName} · ${existing.department} · ${existing.status}`;
      // Staff ID is the stable key referenced by attendance records, so it is immutable.
      existing.set({ ...parsed.data, staffId: existing.staffId });
      await existing.save();
      await audit(admin, { action: "staff.update", entity: "staff", entityId: existing.staffId, summary: `Updated ${existing.fullName}`, oldValue: before, newValue: `${existing.fullName} · ${existing.department} · ${existing.status}` });
    } else {
      await Staff.create(parsed.data);
      await audit(admin, { action: "staff.create", entity: "staff", entityId: parsed.data.staffId, summary: `Added ${parsed.data.fullName}` });
    }
  } catch (e) {
    if (isDuplicate(e)) return { ok: false, errors: { staffId: "This staff ID already exists" }, message: "This staff ID already exists." };
    throw e;
  }
  refresh("/staff", "/departments");
  return { ok: true, message: "Staff profile saved." };
}

export async function toggleStaffStatusAction(staffId: string) {
  const admin = await requireAdmin();
  await connectDB();
  const staff = await Staff.findOne({ staffId });
  if (!staff) return { ok: false, message: "Staff member not found." };
  const next = staff.status === "active" ? "inactive" : "active";
  const before = staff.status;
  staff.status = next;
  await staff.save();
  await audit(admin, { action: next === "active" ? "staff.reactivate" : "staff.deactivate", entity: "staff", entityId: staffId, summary: `${next === "active" ? "Reactivated" : "Deactivated"} ${staff.fullName}`, oldValue: before ?? "", newValue: next });
  refresh("/staff");
  return { ok: true, message: `${staff.fullName} is now ${next}.` };
}

export type ImportRow = { staffId: string; fullName: string; department: string; jobTitle: string; status: string };

export async function importStaffAction(rows: ImportRow[]) {
  const admin = await requireAdmin();
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, message: "No rows to import." };
  if (rows.length > 2000) return { ok: false, message: "Import up to 2,000 rows at a time." };
  const valid: ReturnType<typeof staffSchema.parse>[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const parsed = staffSchema.safeParse({ ...row, status: row.status?.toLowerCase() || "active" });
    if (parsed.success) valid.push(parsed.data);
    else errors.push(`Row ${i + 2}: ${parsed.error.issues[0]?.message}`);
  });
  if (errors.length) return { ok: false, message: `Fix ${errors.length} row(s) before importing. ${errors.slice(0, 3).join(" ")}` };
  await connectDB();
  const result = await Staff.bulkWrite(
    valid.map((s) => ({ updateOne: { filter: { staffId: s.staffId }, update: { $set: s }, upsert: true } })),
  );
  await Department.bulkWrite(
    [...new Set(valid.map((s) => s.department))].map((name) => ({ updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true } })),
  );
  await audit(admin, { action: "staff.import", entity: "staff", summary: `CSV import: ${result.upsertedCount} added, ${result.modifiedCount} updated` });
  refresh("/staff", "/departments");
  return { ok: true, message: `Imported ${valid.length} rows (${result.upsertedCount} new, ${result.modifiedCount} updated).` };
}

/* --------------------------------------------------------------- Sessions */

export async function saveSessionAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = sessionSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const original = String(form.get("original") || "");
  await connectDB();
  try {
    if (original) {
      const existing = await TrainingSession.findOne({ code: original });
      if (!existing) return { ok: false, message: "Session not found." };
      const before = existing.status;
      existing.set({ ...parsed.data, code: existing.code });
      await existing.save();
      await audit(admin, { action: "session.update", entity: "session", entityId: existing.code, summary: `Updated ${existing.title}`, oldValue: before, newValue: existing.status });
    } else {
      await TrainingSession.create(parsed.data);
      await audit(admin, { action: "session.create", entity: "session", entityId: parsed.data.code, summary: `Created ${parsed.data.title}` });
    }
  } catch (e) {
    if (isDuplicate(e)) return { ok: false, errors: { code: "This session ID already exists" }, message: "This session ID already exists." };
    throw e;
  }
  refresh("/sessions", "/qr");
  return { ok: true, message: "Training session saved." };
}

export async function setSessionStatusAction(code: string, status: SessionStatus) {
  const admin = await requireAdmin();
  if (!SESSION_STATUSES.includes(status)) return { ok: false, message: "Invalid status." };
  await connectDB();
  const session = await TrainingSession.findOne({ code });
  if (!session) return { ok: false, message: "Session not found." };
  const before = session.status;
  session.status = status;
  // Any status change revokes QR codes that are already circulating.
  session.qrVersion = (session.qrVersion ?? 1) + 1;
  await session.save();
  await audit(admin, { action: "session.status", entity: "session", entityId: code, summary: `${session.title}: ${before} → ${status}`, oldValue: before ?? "", newValue: status });
  refresh("/sessions", "/qr");
  return { ok: true, message: `Session is now ${status}.` };
}

/** Completes a session and records everyone expected but not checked in as absent. */
export async function closeSessionAction(code: string) {
  const admin = await requireAdmin();
  await connectDB();
  const session = await TrainingSession.findOne({ code });
  if (!session) return { ok: false, message: "Session not found." };
  const staffQuery: Record<string, unknown> = { status: "active" };
  if (session.department && session.department !== "All departments") staffQuery.department = session.department;
  const [staff, existing] = await Promise.all([Staff.find(staffQuery).select("staffId").lean(), Attendance.find({ sessionCode: code }).select("staffId").lean()]);
  const recorded = new Set(existing.map((r) => r.staffId));
  const missing = staff.filter((s) => !recorded.has(s.staffId));
  if (missing.length) {
    await Attendance.bulkWrite(
      missing.map((s) => ({
        updateOne: {
          filter: { sessionCode: code, staffId: s.staffId },
          update: { $setOnInsert: { sessionCode: code, staffId: s.staffId, status: "Absent", checkIn: null, method: "Auto-close" } },
          upsert: true,
        },
      })),
    );
  }
  const before = session.status;
  session.status = "Completed";
  session.qrVersion = (session.qrVersion ?? 1) + 1;
  await session.save();
  await audit(admin, { action: "session.close", entity: "session", entityId: code, summary: `Closed ${session.title}; ${missing.length} marked absent`, oldValue: before ?? "", newValue: "Completed" });
  refresh("/sessions", "/qr", "/attendance", "/reports");
  return { ok: true, message: `Session closed. ${missing.length} staff marked absent.` };
}

export async function deleteSessionAction(code: string) {
  const admin = await requireAdmin();
  await connectDB();
  const count = await Attendance.countDocuments({ sessionCode: code });
  if (count > 0) return { ok: false, message: "Sessions with attendance records cannot be deleted. Cancel it instead." };
  const session = await TrainingSession.findOneAndDelete({ code });
  if (!session) return { ok: false, message: "Session not found." };
  await audit(admin, { action: "session.delete", entity: "session", entityId: code, summary: `Deleted ${session.title}` });
  refresh("/sessions", "/qr");
  return { ok: true, message: "Session deleted." };
}

/* --------------------------------------------------------------------- QR */

export async function issueQrTokenAction(code: string) {
  await requireAdmin();
  await connectDB();
  const session = await TrainingSession.findOne({ code }).lean();
  if (!session) return { ok: false as const, message: "Session not found." };
  if (session.status !== "Live") return { ok: false as const, message: "Set the session to Live to accept check-ins." };
  const { token, expiresAt } = await issueCheckinToken(session.code, session.qrVersion ?? 1, session.qrExpiryMinutes ?? 10);
  return { ok: true as const, token, expiresAt };
}

export async function revokeQrAction(code: string) {
  const admin = await requireAdmin();
  await connectDB();
  await TrainingSession.updateOne({ code }, { $inc: { qrVersion: 1 } });
  await audit(admin, { action: "qr.revoke", entity: "session", entityId: code, summary: "Revoked all active QR codes" });
  return { ok: true, message: "All previously issued QR codes are now invalid." };
}

/* ------------------------------------------------------------- Attendance */

export async function correctAttendanceAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = correctionSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  await connectDB();
  const record = await Attendance.findById(parsed.data.id).catch(() => null);
  if (!record) return { ok: false, message: "Attendance record not found." };
  const before = record.status;
  if (parsed.data.status === "reset") {
    await record.deleteOne();
  } else {
    record.status = parsed.data.status;
    record.method = "Admin correction";
    if (parsed.data.status === "Present" && !record.checkIn) record.checkIn = new Date();
    if (parsed.data.status === "Absent") record.checkIn = null;
    await record.save();
  }
  await audit(admin, {
    action: parsed.data.status === "reset" ? "attendance.reset" : "attendance.correct",
    entity: "attendance",
    entityId: `${record.sessionCode}/${record.staffId}`,
    summary: `${record.staffId} in ${record.sessionCode}`,
    reason: parsed.data.reason,
    oldValue: before,
    newValue: parsed.data.status === "reset" ? "Reset" : parsed.data.status,
  });
  refresh("/attendance", "/reports", "/qr", "/audit");
  return { ok: true, message: parsed.data.status === "reset" ? "Attendance record reset." : "Attendance correction saved." };
}

export async function manualAttendanceAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = manualAttendanceSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  await connectDB();
  const [session, staff] = await Promise.all([
    TrainingSession.exists({ code: parsed.data.sessionCode }),
    Staff.exists({ staffId: parsed.data.staffId }),
  ]);
  if (!session || !staff) return { ok: false, message: "Unknown session or staff member." };
  try {
    await Attendance.create({
      sessionCode: parsed.data.sessionCode,
      staffId: parsed.data.staffId,
      status: parsed.data.status,
      checkIn: parsed.data.status === "Present" ? new Date() : null,
      method: "Admin entry",
    });
  } catch (e) {
    if (isDuplicate(e)) return { ok: false, message: "A record already exists. Use a correction instead." };
    throw e;
  }
  await audit(admin, { action: "attendance.manual", entity: "attendance", entityId: `${parsed.data.sessionCode}/${parsed.data.staffId}`, summary: `Manual ${parsed.data.status}`, reason: parsed.data.reason, newValue: parsed.data.status });
  refresh("/attendance", "/reports", "/qr", "/audit");
  return { ok: true, message: "Attendance recorded." };
}

/* ------------------------------------------------------------ Departments */

export async function saveDepartmentAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = departmentSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const original = String(form.get("original") || "");
  await connectDB();
  try {
    if (original && original !== parsed.data.name) {
      await Department.findOneAndUpdate({ name: original }, { $set: parsed.data }, { upsert: true });
      await Staff.updateMany({ department: original }, { $set: { department: parsed.data.name } });
      await TrainingSession.updateMany({ department: original }, { $set: { department: parsed.data.name } });
      await audit(admin, { action: "department.rename", entity: "department", entityId: parsed.data.name, oldValue: original, newValue: parsed.data.name, summary: `Renamed ${original}` });
    } else if (original) {
      await Department.findOneAndUpdate({ name: original }, { $set: parsed.data }, { upsert: true });
      await audit(admin, { action: "department.update", entity: "department", entityId: original, summary: `Updated ${original}` });
    } else {
      await Department.create(parsed.data);
      await audit(admin, { action: "department.create", entity: "department", entityId: parsed.data.name, summary: `Created ${parsed.data.name}` });
    }
  } catch (e) {
    if (isDuplicate(e)) return { ok: false, errors: { name: "This department already exists" }, message: "This department already exists." };
    throw e;
  }
  refresh("/departments", "/staff");
  return { ok: true, message: "Department saved." };
}

export async function deleteDepartmentAction(name: string) {
  const admin = await requireAdmin();
  await connectDB();
  if (await Staff.exists({ department: name })) return { ok: false, message: "Move staff out of this department before deleting it." };
  await Department.deleteOne({ name });
  await audit(admin, { action: "department.delete", entity: "department", entityId: name, summary: `Deleted ${name}` });
  refresh("/departments");
  return { ok: true, message: "Department deleted." };
}

/* --------------------------------------------------------------- Settings */

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  await connectDB();
  await Settings.updateOne({ key: "global" }, { $set: parsed.data }, { upsert: true });
  await audit(admin, { action: "settings.update", entity: "settings", summary: `Organization: ${parsed.data.organization}` });
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

export async function addAdminAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = adminSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  await connectDB();
  try {
    await Admin.create({ name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash: await hashPassword(parsed.data.password), role: "admin" });
  } catch (e) {
    if (isDuplicate(e)) return { ok: false, errors: { email: "An administrator with this email exists" }, message: "An administrator with this email exists." };
    throw e;
  }
  await audit(admin, { action: "admin.create", entity: "admin", entityId: parsed.data.email, summary: `Added administrator ${parsed.data.name}` });
  revalidatePath("/settings");
  return { ok: true, message: "Administrator added." };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = passwordSchema.safeParse(formToObject(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  await connectDB();
  const admin = await Admin.findById(session.id);
  if (!admin || !(await bcrypt.compare(parsed.data.current, admin.passwordHash))) {
    return { ok: false, errors: { current: "Current password is incorrect" }, message: "Current password is incorrect." };
  }
  admin.passwordHash = await hashPassword(parsed.data.next);
  await admin.save();
  await audit(session, { action: "admin.password", entity: "admin", entityId: admin.email, summary: "Changed password" });
  return { ok: true, message: "Password updated." };
}

export async function loadDemoDataAction() {
  const admin = await requireAdmin();
  await connectDB();
  const result = await seedDemoData();
  await audit(admin, { action: "demo.seed", entity: "system", summary: `Loaded demo data (${result.staff} staff, ${result.sessions} sessions)` });
  revalidatePath("/", "layout");
  return { ok: true, message: "Demo data loaded." };
}
