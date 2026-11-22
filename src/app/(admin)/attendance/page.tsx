import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAttendance, listSessions } from "@/lib/data";
import { attendanceFilterFrom, flat, type RawParams } from "@/lib/filters";
import { formatDate } from "@/lib/format";
import { LocalTime } from "@/components/client/local-time";
import { Avatar, Badge, Empty, PageHeading, Pagination, withParams } from "@/components/ui";
import { SearchInput, SelectFilter } from "@/components/client/filter-bar";
import { CorrectButton } from "./correct-button";

export const metadata: Metadata = { title: "Attendance records" };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireAdmin();
  const raw = await searchParams;
  const params = flat(raw);
  const filter = attendanceFilterFrom(raw);
  const [data, sessions] = await Promise.all([listAttendance(filter), listSessions()]);
  const exportHref = withParams("/api/export/attendance", params, { page: undefined, sort: undefined });
  const sortHref = (sort: string) => withParams("/attendance", params, { sort, page: undefined });
  const sortLink = (key: string, label: string) => (
    <Link className={`sort-link${(filter.sort ?? "recent") === key ? " active" : ""}`} href={sortHref(key)}>
      {label}
    </Link>
  );

  return (
    <>
      <PageHeading kicker="Operations ledger" title="Attendance records" copy={`${data.total} records matching your filters`} actions={<a className="btn" href={exportHref}>↓ Export CSV</a>} />
      <div className="filter-bar">
        <SearchInput name="q" placeholder="Search staff or session" initial={params.q ?? ""} />
        <SelectFilter name="status" label="Status" value={params.status ?? "all"} options={[{ value: "all", label: "All statuses" }, { value: "Present", label: "Present" }, { value: "Absent", label: "Absent" }]} />
        <SelectFilter name="session" label="Session" value={params.session ?? "all"} options={[{ value: "all", label: "All sessions" }, ...sessions.map((s) => ({ value: s.code, label: s.title }))]} />
      </div>
      <div className="table-wrap">
        {data.rows.length === 0 ? (
          <Empty title="No attendance records match" />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>{sortLink("name", "Full name")}</th>
                    <th>Department</th>
                    <th>{sortLink("session", "Training session")}</th>
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>{sortLink("status", "Status")}</th>
                    <th>Method</th>
                    <th>{sortLink("recent", "Last updated")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.staffId}</td>
                      <td>
                        <div className="staff-cell">
                          <Avatar name={r.fullName} />
                          <strong>{r.fullName}</strong>
                        </div>
                      </td>
                      <td>{r.department}</td>
                      <td>{r.sessionTitle}</td>
                      <td>{formatDate(r.sessionDate)}</td>
                      <td><LocalTime value={r.checkIn} /></td>
                      <td><Badge value={r.status} /></td>
                      <td>{r.method}</td>
                      <td><LocalTime value={r.updatedAt} mode="datetime" /></td>
                      <td><CorrectButton id={r.id} name={r.fullName} session={r.sessionTitle} status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} hrefFor={(p) => withParams("/attendance", params, { page: p })} />
          </>
        )}
      </div>
    </>
  );
}
