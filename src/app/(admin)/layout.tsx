import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { connectDB } from "@/lib/db";
import { TrainingSession } from "@/models";
import { AppShell } from "@/components/client/shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await connectDB();
  const [settings, liveCount] = await Promise.all([getSettings(), TrainingSession.countDocuments({ status: "Live" })]);
  return (
    <AppShell admin={admin} organization={settings.organization} liveCount={liveCount}>
      {children}
    </AppShell>
  );
}
