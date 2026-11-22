import mongoose, { Schema, type Model } from "mongoose";
import { ATTENDANCE_STATUSES, SESSION_STATUSES, STAFF_STATUSES } from "@/lib/constants";


export interface AdminDoc { email: string; name: string; passwordHash: string; role: "owner" | "admin"; lastLoginAt?: Date | null; createdAt?: Date; updatedAt?: Date }
export interface DepartmentDoc { name: string; description: string; createdAt?: Date; updatedAt?: Date }
export interface StaffDoc { staffId: string; fullName: string; department: string; jobTitle: string; status: "active" | "inactive"; createdAt?: Date; updatedAt?: Date }
export interface TrainingSessionDoc {
  code: string; title: string; trainer: string; department: string; date: string; start: string; end: string; venue: string;
  status: "Draft" | "Scheduled" | "Live" | "Completed" | "Cancelled"; qrExpiryMinutes: number; qrVersion: number; createdAt?: Date; updatedAt?: Date;
}
export interface AttendanceDoc { sessionCode: string; staffId: string; status: "Present" | "Absent"; checkIn: Date | null; method: string; createdAt?: Date; updatedAt: Date }
export interface AuditDoc { action: string; entity: string; entityId: string; summary: string; reason: string; oldValue: string; newValue: string; actor: string; createdAt: Date }
export interface SettingsDoc { key: string; organization: string; defaultQrExpiryMinutes: number }
export interface RateLimitDoc { key: string; count: number; expiresAt: Date }

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

const adminSchema = new Schema<AdminDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "admin"], default: "admin" },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

const departmentSchema = new Schema<DepartmentDoc>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

const staffSchema = new Schema<StaffDoc>(
  {
    staffId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true, index: true },
    jobTitle: { type: String, default: "", trim: true },
    status: { type: String, enum: STAFF_STATUSES, default: "active", index: true },
  },
  { timestamps: true },
);

const trainingSessionSchema = new Schema<TrainingSessionDoc>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    trainer: { type: String, default: "", trim: true },
    department: { type: String, default: "All departments", trim: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    start: { type: String, required: true }, // HH:mm
    end: { type: String, required: true },
    venue: { type: String, default: "", trim: true },
    status: { type: String, enum: SESSION_STATUSES, default: "Draft", index: true },
    qrExpiryMinutes: { type: Number, default: 10, min: 1, max: 120 },
    /** Incrementing this revokes every QR token issued so far. */
    qrVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

const attendanceSchema = new Schema<AttendanceDoc>(
  {
    sessionCode: { type: String, required: true, index: true },
    staffId: { type: String, required: true, index: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    checkIn: { type: Date, default: null },
    method: { type: String, enum: ["QR scan", "Admin entry", "Admin correction", "Auto-close"], default: "QR scan" },
  },
  { timestamps: true },
);
// The database, not the UI, guarantees one record per person per session.
attendanceSchema.index({ sessionCode: 1, staffId: 1 }, { unique: true });

const auditSchema = new Schema<AuditDoc>(
  {
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: "" },
    summary: { type: String, default: "" },
    reason: { type: String, default: "" },
    oldValue: { type: String, default: "" },
    newValue: { type: String, default: "" },
    actor: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditSchema.index({ createdAt: -1 });

const settingsSchema = new Schema<SettingsDoc>(
  {
    key: { type: String, default: "global", unique: true },
    organization: { type: String, default: "Northstar Co." },
    defaultQrExpiryMinutes: { type: Number, default: 10 },
  },
  { timestamps: true },
);

const rateLimitSchema = new Schema<RateLimitDoc>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


export const Admin = model<AdminDoc>("Admin", adminSchema);
export const Department = model<DepartmentDoc>("Department", departmentSchema);
export const Staff = model<StaffDoc>("Staff", staffSchema);
export const TrainingSession = model<TrainingSessionDoc>("TrainingSession", trainingSessionSchema);
export const Attendance = model<AttendanceDoc>("Attendance", attendanceSchema);
export const AuditLog = model<AuditDoc>("AuditLog", auditSchema);
export const Settings = model<SettingsDoc>("Settings", settingsSchema);
export const RateLimit = model<RateLimitDoc>("RateLimit", rateLimitSchema);
