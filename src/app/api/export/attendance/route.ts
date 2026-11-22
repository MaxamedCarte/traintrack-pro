import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getSettings, listAttendance } from "@/lib/data";
import { attendanceFilterFrom } from "@/lib/filters";
import { toCsv } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Filter-aware export. `format=json` feeds the in-browser PDF generator. */
export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filter = { ...attendanceFilterFrom(params), page: 1, pageSize: null, sort: params.sort ?? "session" };
  const [data, settings] = await Promise.all([listAttendance(filter), getSettings()]);

  if (params.format === "json") {
    return NextResponse.json({ organization: settings.organization, generatedAt: new Date().toISOString(), total: data.total, present: data.present, absent: data.absent, rows: data.rows });
  }

  const csv = toCsv([
    ["Staff ID", "Full name", "Department", "Session ID", "Session", "Session date", "Status", "Check-in", "Method", "Last updated"],
    ...data.rows.map((r) => [r.staffId, r.fullName, r.department, r.sessionCode, r.sessionTitle, r.sessionDate, r.status, r.checkIn ?? "", r.method, r.updatedAt]),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="traintrack-attendance-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
