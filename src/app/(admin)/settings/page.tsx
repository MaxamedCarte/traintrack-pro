import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { connectDB } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Admin } from "@/models";
import { PageHeading } from "@/components/ui";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireAdmin();
  await connectDB();
  const [settings, admins] = await Promise.all([getSettings(), Admin.find().sort({ createdAt: 1 }).lean()]);
  return (
    <>
      <PageHeading kicker="Workspace controls" title="Settings" copy="Organization, administrators and data" />
      <SettingsClient
        settings={settings}
        me={me}
        admins={admins.map((a) => ({ id: String(a._id), name: a.name, email: a.email, role: a.role ?? "admin", lastLogin: a.lastLoginAt ? formatDateTime(a.lastLoginAt) : "Never" }))}
      />
    </>
  );
}
