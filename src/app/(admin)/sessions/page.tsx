import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { attendanceCountsBySession, departmentNames, getSettings, listSessions } from "@/lib/data";
import { connectDB } from "@/lib/db";
import { Staff } from "@/models";
import { PageHeading } from "@/components/ui";
import { SessionsClient } from "./sessions-client";

export const metadata: Metadata = { title: "Training sessions" };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ status?: string; new?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  await connectDB();
  const [sessions, counts, departments, settings, staffByDept] = await Promise.all([
    listSessions({ status: params.status }),
    attendanceCountsBySession(),
    departmentNames(),
    getSettings(),
    Staff.aggregate<{ _id: string; n: number }>([{ $match: { status: "active" } }, { $group: { _id: "$department", n: { $sum: 1 } } }]),
  ]);
  const totalStaff = staffByDept.reduce((a, b) => a + b.n, 0);
  const expected = Object.fromEntries(staffByDept.map((d) => [d._id, d.n]));
  const rows = sessions.map((s) => ({
    ...s,
    recorded: counts.get(s.code)?.total ?? 0,
    present: counts.get(s.code)?.present ?? 0,
    expected: s.department === "All departments" ? totalStaff : expected[s.department] ?? 0,
  }));
  return (
    <>
      <PageHeading kicker="Learning calendar" title="Training sessions" copy="Schedule, publish, and monitor organization training" />
      <SessionsClient sessions={rows} departments={departments} defaultQrExpiry={settings.defaultQrExpiryMinutes} openNew={params.new === "1"} statusFilter={params.status ?? "all"} />
    </>
  );
}
