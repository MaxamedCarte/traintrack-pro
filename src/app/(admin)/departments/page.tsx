import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listDepartments } from "@/lib/data";
import { PageHeading } from "@/components/ui";
import { DepartmentsClient } from "./departments-client";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  await requireAdmin();
  const departments = await listDepartments();
  return (
    <>
      <PageHeading kicker="Organization structure" title="Departments" copy={`${departments.length} teams · renaming a department updates every staff profile and session`} />
      <DepartmentsClient departments={departments} />
    </>
  );
}
