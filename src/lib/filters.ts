import type { AttendanceFilter } from "./data";

export type RawParams = Record<string, string | string[] | undefined>;

export function attendanceFilterFrom(params: RawParams): AttendanceFilter & Record<string, string | number | undefined | null> {
  const s = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.slice(0, 80) || undefined;
  };
  return {
    q: s("q"),
    status: s("status"),
    session: s("session"),
    department: s("department"),
    from: s("from"),
    to: s("to"),
    sort: s("sort"),
    page: Number(s("page")) || 1,
  };
}

export const flat = (params: RawParams) =>
  Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Record<string, string | undefined>;
