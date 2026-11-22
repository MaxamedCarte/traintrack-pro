import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { departmentNames, listStaff } from "@/lib/data";
import { connectDB } from "@/lib/db";
import { Attendance } from "@/models";
import { PageHeading } from "@/components/ui";
import { StaffClient } from "./staff-client";

export const metadata: Metadata = { title: "Staff directory" };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ q?: string; department?: string; status?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  await connectDB();
  const [staff, departments, counts, total] = await Promise.all([
    listStaff(params),
    departmentNames(),
    Attendance.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$staffId", n: { $sum: 1 } } }]),
    listStaff().then((s) => s.length),
  ]);
  const sessionCounts = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  return (
    <>
      <PageHeading kicker="People operations" title="Staff directory" copy={`${total} staff profiles in the organization`} />
      <StaffClient staff={staff} departments={departments} sessionCounts={sessionCounts} filters={{ q: params.q ?? "", department: params.department ?? "all", status: params.status ?? "all" }} />
    </>
  );
}
