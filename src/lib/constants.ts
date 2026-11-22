export const SESSION_STATUSES = ["Draft", "Scheduled", "Live", "Completed", "Cancelled"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ATTENDANCE_STATUSES = ["Present", "Absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const STAFF_STATUSES = ["active", "inactive"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const ALL_DEPARTMENTS = "All departments";
export const SESSION_COOKIE = "tt_session";
export const PAGE_SIZE = 20;
