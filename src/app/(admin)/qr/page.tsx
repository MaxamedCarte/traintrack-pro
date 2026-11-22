import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listSessions, sessionRoster } from "@/lib/data";
import { env } from "@/lib/env";
import { Empty, PageHeading } from "@/components/ui";
import { QrClient } from "./qr-client";

export const metadata: Metadata = { title: "QR attendance" };

export default async function QrPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  await requireAdmin();
  const { session: selected } = await searchParams;
  const sessions = await listSessions();
  const target = sessions.find((s) => s.code === selected?.toUpperCase()) ?? sessions.find((s) => s.status === "Live") ?? sessions.find((s) => s.status === "Scheduled") ?? sessions[0];

  if (!target) {
    return (
      <>
        <PageHeading kicker="Mobile attendance" title="QR attendance" copy="A session-specific check-in experience for staff on site" />
        <div className="table-wrap">
          <Empty title="No training sessions yet">
            <Link className="btn btn-primary" href="/sessions?new=1" style={{ marginTop: 12 }}>Create a session</Link>
          </Empty>
        </div>
      </>
    );
  }

  const roster = (await sessionRoster(target.code))!;
  const h = await headers();
  const origin = env.appUrl || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  return (
    <>
      <PageHeading kicker="Mobile attendance" title="QR attendance" copy="Display the rotating code at the venue. Staff scan it on their phones to check in." />
      <QrClient
        key={target.code}
        origin={origin}
        session={target}
        sessions={sessions.map((s) => ({ code: s.code, title: s.title, status: s.status }))}
        roster={roster.roster}
        expected={roster.expected}
        present={roster.present}
        absent={roster.absent}
      />
    </>
  );
}
