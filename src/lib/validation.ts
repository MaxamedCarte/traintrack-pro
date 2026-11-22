import { z } from "zod";
import { ATTENDANCE_STATUSES, SESSION_STATUSES, STAFF_STATUSES } from "./constants";

const text = (max = 120) => z.string().trim().max(max);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const staffSchema = z.object({
  staffId: text(20)
    .min(2, "Staff ID is required")
    .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes only")
    .transform((v) => v.toUpperCase()),
  fullName: text(80).min(2, "Full name is required"),
  department: text(60).min(1, "Department is required"),
  jobTitle: text(80).default(""),
  status: z.enum(STAFF_STATUSES).default("active"),
});

export const sessionSchema = z
  .object({
    code: text(20)
      .min(2, "Session ID is required")
      .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes only")
      .transform((v) => v.toUpperCase()),
    title: text(120).min(3, "Title is required"),
    trainer: text(80).default(""),
    department: text(60).default("All departments"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    start: time,
    end: time,
    venue: text(80).default(""),
    status: z.enum(SESSION_STATUSES),
    qrExpiryMinutes: z.coerce.number().int().min(1).max(120).default(10),
  })
  .refine((s) => s.end > s.start, { message: "End time must be after start time", path: ["end"] });

export const departmentSchema = z.object({
  name: text(60).min(2, "Department name is required"),
  description: text(200).default(""),
});

export const correctionSchema = z.object({
  id: z.string().min(1),
  status: z.enum([...ATTENDANCE_STATUSES, "reset"]),
  reason: text(300).min(5, "Please give a reason of at least 5 characters"),
});

export const manualAttendanceSchema = z.object({
  sessionCode: text(20).min(1),
  staffId: text(20).min(1).transform((v) => v.toUpperCase()),
  status: z.enum(ATTENDANCE_STATUSES),
  reason: text(300).min(5, "Please give a reason of at least 5 characters"),
});

export const checkinSchema = z.object({
  token: z.string().min(10),
  staffId: text(20).min(2, "Enter your staff ID").transform((v) => v.toUpperCase()),
  fullName: text(80).min(2, "Enter your full name"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
});

export const adminSchema = z.object({
  name: text(80).min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(10, "Use at least 10 characters").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export const settingsSchema = z.object({
  organization: text(80).min(2, "Organization name is required"),
  defaultQrExpiryMinutes: z.coerce.number().int().min(1).max(120),
});

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> };

export function fieldErrors(error: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { ok: false, message: "Please fix the highlighted fields.", errors };
}

export const formToObject = (form: FormData) =>
  Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
