import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { departmentNames, listAttendance, listSessions, repeatedAbsences } from "@/lib/data";
import { attendanceFilterFrom, flat, type RawParams } from "@/lib/filters";
import { percent } from "@/lib/format";
import { Empty, PageHeading, withParams } from "@/components/ui";
import { DateFilter, SelectFilter } from "@/components/client/filter-bar";
import { DepartmentChart } from "@/components/client/charts";
import { PdfButton } from "./pdf-button";

export const metadata: Metadata = { title: "Reports & analytics" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireAdmin();
  const raw = await searchParams;
  const params = flat(raw);
  const filter = { ...attendanceFilterFrom(raw), page: 1, pageSize: null };
  const [data, sessions, departments, repeated] = await Promise.all([listAttendance(filter), listSessions(), departmentNames(), repeatedAbsences()]);

  const byDept = new Map<string, { name: string; present: number; total: number }>();
  for (const r of data.rows) {
    const d = byDept.get(r.department) ?? { name: r.department, present: 0, total: 0 };
    d.total++;
    if (r.status === "Present") d.present++;
    byDept.set(r.department, d);
  }
  const deptRows = [...byDept.values()].sort((a, b) => a.name.localeCompare(b.name));
  const query = withParams("", params, { page: undefined }).replace(/^\?/, "");
  const exportHref = `/api/export/attendance${query ? `?${query}` : ""}`;

  return (
    <>
      <PageHeading
        kicker="Insights & exports"
        title="Reports & analytics"
        copy="Build filter-aware attendance reports for management"
        actions={
          <>
            <a className="btn" href={exportHref}>↓ Export CSV</a>
            <PdfButton query={query} />
          </>
        }
      />
      <div className="report-summary">
        <div className="mini-metric"><span>Total records</span><strong>{data.total}</strong></div>
        <div className="mini-metric"><span>Present</span><strong>{data.present}</strong></div>
        <div className="mini-metric"><span>Absent</span><strong>{data.absent}</strong></div>
        <div className="mini-metric"><span>Attendance rate</span><strong>{percent(data.present, data.total)}%</strong></div>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Report filters</h2>
            <p className="panel-subtitle">Totals, charts and both exports use these filters.</p>
          </div>
          {Object.keys(params).length ? <Link className="btn" href="/reports">Clear filters</Link> : null}
        </div>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <SelectFilter name="session" label="Session" value={params.session ?? "all"} options={[{ value: "all", label: "All training sessions" }, ...sessions.map((s) => ({ value: s.code, label: s.title }))]} />
          <SelectFilter name="department" label="Department" value={params.department ?? "all"} options={[{ value: "all", label: "All departments" }, ...departments.map((d) => ({ value: d, label: d }))]} />
          <SelectFilter name="status" label="Status" value={params.status ?? "all"} options={[{ value: "all", label: "All statuses" }, { value: "Present", label: "Present" }, { value: "Absent", label: "Absent" }]} />
          <DateFilter name="from" label="From date" value={params.from ?? ""} />
          <DateFilter name="to" label="To date" value={params.to ?? ""} />
        </div>
      </section>
      <div className="dashboard-grid" style={{ marginTop: 18 }}>
        <section className="panel">
          <h2 className="panel-title">Department comparison</h2>
          <p className="panel-subtitle">Present and absent records for the current filters</p>
          <div className="chart-box" style={{ marginTop: 12 }}>{deptRows.length ? <DepartmentChart rows={deptRows} stacked /> : <Empty title="No data for these filters" />}</div>
        </section>
        <section className="panel">
          <h2 className="panel-title">Repeated absences</h2>
          <p className="panel-subtitle">Staff with two or more absences across all sessions</p>
          {repeated.length ? (
            repeated.map((r) => (
              <Link key={r.staffId} href={`/staff/${r.staffId}`} className="list-row">
                <div className="list-main">
                  <strong>{r.fullName}</strong>
                  <small>{r.staffId} · {r.department}</small>
                </div>
                <div className="list-value negative">{r.absences} absences</div>
              </Link>
            ))
          ) : (
            <Empty title="No repeated absences" />
          )}
        </section>
      </div>
    </>
  );
}
