import "server-only";
import type { PipelineStage } from "mongoose";
import { connectDB } from "./db";
import { Attendance, AuditLog, Department, Settings, Staff, TrainingSession } from "@/models";
import type { AttendanceStatus, SessionStatus, StaffStatus } from "./constants";
import { PAGE_SIZE } from "./constants";

export type StaffDTO = { staffId: string; fullName: string; department: string; jobTitle: string; status: StaffStatus };
export type SessionDTO = {
  code: string;
  title: string;
  trainer: string;
  department: string;
  date: string;
  start: string;
  end: string;
  venue: string;
  status: SessionStatus;
  qrExpiryMinutes: number;
};
export type AttendanceDTO = {
  id: string;
  sessionCode: string;
  staffId: string;
  status: AttendanceStatus;
  checkIn: string | null;
  method: string;
  updatedAt: string;
};
export type AttendanceRow = AttendanceDTO & {
  fullName: string;
  department: string;
  sessionTitle: string;
  sessionDate: string;
};
export type AuditDTO = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  reason: string;
  oldValue: string;
  newValue: string;
  actor: string;
  createdAt: string;
};
export type DepartmentDTO = { id: string; name: string; description: string; staffCount: number };

const toStaff = (d: any): StaffDTO => ({
  staffId: d.staffId,
  fullName: d.fullName,
  department: d.department,
  jobTitle: d.jobTitle ?? "",
  status: d.status,
});
export const toSession = (d: any): SessionDTO => ({
  code: d.code,
  title: d.title,
  trainer: d.trainer ?? "",
  department: d.department ?? "All departments",
  date: d.date,
  start: d.start,
  end: d.end,
  venue: d.venue ?? "",
  status: d.status,
  qrExpiryMinutes: d.qrExpiryMinutes ?? 10,
});
const toAttendance = (d: any): AttendanceDTO => ({
  id: String(d._id),
  sessionCode: d.sessionCode,
  staffId: d.staffId,
  status: d.status,
  checkIn: d.checkIn ? new Date(d.checkIn).toISOString() : null,
  method: d.method,
  updatedAt: new Date(d.updatedAt).toISOString(),
});

export async function getSettings() {
  await connectDB();
  const s = await Settings.findOneAndUpdate({ key: "global" }, { $setOnInsert: { key: "global" } }, { upsert: true, returnDocument: "after" }).lean();
  return { organization: s?.organization ?? "Northstar Co.", defaultQrExpiryMinutes: s?.defaultQrExpiryMinutes ?? 10 };
}

export async function listStaff(filter: { q?: string; department?: string; status?: string } = {}) {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filter.department && filter.department !== "all") query.department = filter.department;
  if (filter.status && filter.status !== "all") query.status = filter.status;
  if (filter.q) {
    const rx = new RegExp(escapeRegex(filter.q), "i");
    query.$or = [{ fullName: rx }, { staffId: rx }, { jobTitle: rx }];
  }
  const docs = await Staff.find(query).sort({ fullName: 1 }).lean();
  return docs.map(toStaff);
}

export async function getStaff(staffId: string) {
  await connectDB();
  const doc = await Staff.findOne({ staffId: staffId.toUpperCase() }).lean();
  return doc ? toStaff(doc) : null;
}

export async function listSessions(filter: { status?: string } = {}) {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filter.status && filter.status !== "all") query.status = filter.status;
  const docs = await TrainingSession.find(query).sort({ date: -1, start: -1 }).lean();
  return docs.map(toSession);
}

export async function getSession(code: string) {
  await connectDB();
  const doc = await TrainingSession.findOne({ code: code.toUpperCase() }).lean();
  return doc ? toSession(doc) : null;
}

export async function listDepartments(): Promise<DepartmentDTO[]> {
  await connectDB();
  const [departments, counts] = await Promise.all([
    Department.find().sort({ name: 1 }).lean(),
    Staff.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$department", n: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c.n]));
  const known = new Set(departments.map((d) => d.name));
  const rows = departments.map((d) => ({
    id: String(d._id),
    name: d.name,
    description: d.description ?? "",
    staffCount: countMap.get(d.name) ?? 0,
  }));
  // Surface departments that only exist on staff records (e.g. after CSV import).
  for (const [name, n] of countMap) if (!known.has(name)) rows.push({ id: "", name, description: "", staffCount: n });
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function departmentNames() {
  return (await listDepartments()).map((d) => d.name);
}

export type AttendanceFilter = {
  q?: string;
  status?: string;
  session?: string;
  department?: string;
  from?: string;
  to?: string;
  staffId?: string;
  sort?: string;
  page?: number;
  pageSize?: number | null;
};

/** Attendance joined with staff and session details, filtered and paginated in MongoDB. */
export async function listAttendance(filter: AttendanceFilter = {}) {
  await connectDB();
  const match: Record<string, unknown> = {};
  if (filter.status && filter.status !== "all") match.status = filter.status;
  if (filter.session && filter.session !== "all") match.sessionCode = filter.session;
  if (filter.staffId) match.staffId = filter.staffId.toUpperCase();

  const post: Record<string, unknown> = {};
  if (filter.department && filter.department !== "all") post["staff.department"] = filter.department;
  if (filter.from || filter.to) {
    post["session.date"] = { ...(filter.from ? { $gte: filter.from } : {}), ...(filter.to ? { $lte: filter.to } : {}) };
  }
  if (filter.q) {
    const rx = new RegExp(escapeRegex(filter.q), "i");
    post.$or = [{ "staff.fullName": rx }, { staffId: rx }, { "session.title": rx }];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    recent: { updatedAt: -1 },
    name: { "staff.fullName": 1 },
    session: { "session.date": -1, "staff.fullName": 1 },
    status: { status: 1, updatedAt: -1 },
  };
  const sort = sortMap[filter.sort ?? "recent"] ?? sortMap.recent;
  const pageSize = filter.pageSize === null ? null : filter.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, filter.page ?? 1);

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $lookup: { from: "staffs", localField: "staffId", foreignField: "staffId", as: "staff" } },
    { $lookup: { from: "trainingsessions", localField: "sessionCode", foreignField: "code", as: "session" } },
    { $unwind: { path: "$staff", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$session", preserveNullAndEmptyArrays: true } },
    { $match: post },
    { $sort: sort },
  ];

  const [result] = await Attendance.aggregate([
    ...pipeline,
    {
      $facet: {
        rows: pageSize ? [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }] : [{ $skip: 0 }],
        total: [{ $count: "n" }],
        present: [{ $match: { status: "Present" } }, { $count: "n" }],
      },
    },
  ]);

  const rows: AttendanceRow[] = (result?.rows ?? []).map((d: any) => ({
    ...toAttendance(d),
    fullName: d.staff?.fullName ?? "Removed staff member",
    department: d.staff?.department ?? "-",
    sessionTitle: d.session?.title ?? "Removed session",
    sessionDate: d.session?.date ?? "",
  }));
  const total = result?.total?.[0]?.n ?? 0;
  const present = result?.present?.[0]?.n ?? 0;
  return { rows, total, present, absent: total - present, page, pages: pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1 };
}

export async function attendanceCountsBySession() {
  await connectDB();
  const rows = await Attendance.aggregate<{ _id: string; total: number; present: number }>([
    { $group: { _id: "$sessionCode", total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } } } },
  ]);
  return new Map(rows.map((r) => [r._id, { total: r.total, present: r.present }]));
}

export async function sessionRoster(code: string) {
  await connectDB();
  const session = await getSession(code);
  if (!session) return null;
  const staffQuery: Record<string, unknown> = { status: "active" };
  if (session.department && session.department !== "All departments") staffQuery.department = session.department;
  const [staff, records] = await Promise.all([
    Staff.find(staffQuery).sort({ fullName: 1 }).lean(),
    Attendance.find({ sessionCode: session.code }).lean(),
  ]);
  const byStaff = new Map(records.map((r) => [r.staffId, toAttendance(r)]));
  return {
    session,
    expected: staff.length,
    roster: staff.map((s) => ({ ...toStaff(s), record: byStaff.get(s.staffId) ?? null })),
    present: records.filter((r) => r.status === "Present").length,
    absent: records.filter((r) => r.status === "Absent").length,
  };
}

export async function dashboardStats() {
  await connectDB();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const today = new Date().toISOString().slice(0, 10);

  const [staffCount, sessionCount, statusCounts, todaySessions, upcoming, trend, byDept, recent, liveCount] = await Promise.all([
    Staff.countDocuments({ status: "active" }),
    TrainingSession.countDocuments(),
    Attendance.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    TrainingSession.countDocuments({ date: today }),
    TrainingSession.find({ status: { $in: ["Live", "Scheduled"] } }).sort({ date: 1, start: 1 }).limit(4).lean(),
    Attendance.aggregate<{ _id: { day: string; status: string }; n: number }>([
      { $match: { updatedAt: { $gte: since } } },
      { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, status: "$status" }, n: { $sum: 1 } } },
    ]),
    Attendance.aggregate<{ _id: string; present: number; total: number }>([
      { $lookup: { from: "staffs", localField: "staffId", foreignField: "staffId", as: "staff" } },
      { $unwind: "$staff" },
      { $group: { _id: "$staff.department", total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    listAttendance({ sort: "recent", pageSize: 5 }),
    TrainingSession.countDocuments({ status: "Live" }),
  ]);

  const present = statusCounts.find((s) => s._id === "Present")?.n ?? 0;
  const absent = statusCounts.find((s) => s._id === "Absent")?.n ?? 0;

  const days: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  const trendMap = new Map(trend.map((t) => [`${t._id.day}|${t._id.status}`, t.n]));

  return {
    staffCount,
    sessionCount,
    present,
    absent,
    todaySessions,
    liveCount,
    upcoming: upcoming.map(toSession),
    trend: {
      labels: days.map((d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
      present: days.map((d) => trendMap.get(`${d}|Present`) ?? 0),
      absent: days.map((d) => trendMap.get(`${d}|Absent`) ?? 0),
    },
    departments: byDept.map((d) => ({ name: d._id, present: d.present, total: d.total })),
    recent: recent.rows,
  };
}

export async function repeatedAbsences(min = 2) {
  await connectDB();
  const rows = await Attendance.aggregate<{ _id: string; n: number }>([
    { $match: { status: "Absent" } },
    { $group: { _id: "$staffId", n: { $sum: 1 } } },
    { $match: { n: { $gte: min } } },
    { $sort: { n: -1 } },
    { $limit: 10 },
  ]);
  const staff = await Staff.find({ staffId: { $in: rows.map((r) => r._id) } }).lean();
  const names = new Map(staff.map((s) => [s.staffId, s]));
  return rows.map((r) => ({ staffId: r._id, fullName: names.get(r._id)?.fullName ?? r._id, department: names.get(r._id)?.department ?? "-", absences: r.n }));
}

export async function listAudit(page = 1, pageSize = 25) {
  await connectDB();
  const [docs, total] = await Promise.all([
    AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    AuditLog.countDocuments(),
  ]);
  const rows: AuditDTO[] = docs.map((d) => ({
    id: String(d._id),
    action: d.action,
    entity: d.entity,
    entityId: d.entityId ?? "",
    summary: d.summary ?? "",
    reason: d.reason ?? "",
    oldValue: d.oldValue ?? "",
    newValue: d.newValue ?? "",
    actor: d.actor,
    createdAt: new Date(d.createdAt as Date).toISOString(),
  }));
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 80);
}
