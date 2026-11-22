import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getStaff, listAttendance } from "@/lib/data";
import { formatDate, percent } from "@/lib/format";
import { LocalTime } from "@/components/client/local-time";
import { Badge, Empty, PageHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Attendance history" };

export default async function StaffHistoryPage({ params }: { params: Promise<{ staffId: string }> }) {
  await requireAdmin();
  const { staffId } = await params;
  const person = await getStaff(decodeURIComponent(staffId));
  if (!person) notFound();
  const history = await listAttendance({ staffId: person.staffId, sort: "session", pageSize: null });
  return (
    <>
      <PageHeading
        kicker={`${person.staffId} · ${person.department}`}
        title={person.fullName}
        copy={`${person.jobTitle || "Staff member"} · ${history.total} sessions recorded · ${percent(history.present, history.total)}% attendance`}
        actions={<Link className="btn" href="/staff">← Back to directory</Link>}
      />
      <div className="report-summary">
        <div className="mini-metric"><span>Status</span><strong><Badge value={person.status} /></strong></div>
        <div className="mini-metric"><span>Present</span><strong>{history.present}</strong></div>
        <div className="mini-metric"><span>Absent</span><strong>{history.absent}</strong></div>
      </div>
      <div className="table-wrap">
        {history.rows.length === 0 ? (
          <Empty title="No attendance recorded yet" />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Session</th><th>Date</th><th>Check-in</th><th>Status</th><th>Method</th><th>Last updated</th></tr>
              </thead>
              <tbody>
                {history.rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.sessionTitle}</strong><br /><small className="muted">{r.sessionCode}</small></td>
                    <td>{formatDate(r.sessionDate)}</td>
                    <td><LocalTime value={r.checkIn} /></td>
                    <td><Badge value={r.status} /></td>
                    <td>{r.method}</td>
                    <td><LocalTime value={r.updatedAt} mode="datetime" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
