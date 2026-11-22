import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { dashboardStats, getSettings } from "@/lib/data";
import { formatDate, formatTime, percent } from "@/lib/format";
import { Avatar, Badge, Empty, Kpi, PageHeading } from "@/components/ui";
import { DepartmentChart, StatusChart, TrendChart } from "@/components/client/charts";

export const metadata: Metadata = { title: "Overview" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function OverviewPage() {
  const admin = await requireAdmin();
  const [s, settings] = await Promise.all([dashboardStats(), getSettings()]);
  const rate = percent(s.present, s.present + s.absent);
  const firstName = admin.name.split(" ")[0];

  return (
    <>
      <PageHeading
        kicker={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${firstName}`}
        copy={`Here is your attendance overview for ${settings.organization}.`}
        actions={
          <>
            <a className="btn" href="/api/export/attendance">↓ Export CSV</a>
            <Link className="btn btn-primary" href="/sessions?new=1">+ New training session</Link>
          </>
        }
      />
      {s.staffCount === 0 && s.sessionCount === 0 ? (
        <div className="alert alert-info">
          Your workspace is empty. Add staff and sessions, or <Link href="/settings" style={{ textDecoration: "underline" }}>load demo data from Settings</Link>.
        </div>
      ) : null}
      <div className="kpi-grid">
        <Kpi label="Active staff" value={s.staffCount} foot="Registered in the directory" icon="👥" tone="positive" />
        <Kpi label="Training sessions" value={s.sessionCount} foot={`${s.upcoming.length} live or upcoming`} icon="📅" />
        <Kpi label="Present records" value={s.present} foot={`${rate}% attendance rate`} icon="✓" tone="positive" />
        <Kpi label="Absent records" value={s.absent} foot="Across all sessions" icon="✗" tone="negative" />
        <Kpi label="Sessions today" value={s.todaySessions} foot={`${s.liveCount} currently live`} icon="◉" tone="warning" />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Attendance trend</h2>
              <p className="panel-subtitle">Present and absent records over the last 30 days</p>
            </div>
          </div>
          <div className="chart-box">
            <TrendChart {...s.trend} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Present vs absent</h2>
              <p className="panel-subtitle">All recorded attendance</p>
            </div>
          </div>
          <div className="chart-box small">
            {s.present + s.absent ? <StatusChart present={s.present} absent={s.absent} /> : <Empty title="No attendance yet" />}
          </div>
        </section>
      </div>
      <div className="lower-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Upcoming sessions</h2>
              <p className="panel-subtitle">Live and scheduled training</p>
            </div>
            <Link className="btn" href="/sessions">View all</Link>
          </div>
          {s.upcoming.length ? (
            s.upcoming.map((x) => (
              <Link key={x.code} href={`/qr?session=${x.code}`} className="list-row">
                <div className="list-avatar">{x.title[0]}</div>
                <div className="list-main">
                  <strong>{x.title}</strong>
                  <small>
                    {formatDate(x.date)} · {x.start} · {x.venue}
                  </small>
                </div>
                <div className="list-value">
                  <Badge value={x.status} />
                </div>
              </Link>
            ))
          ) : (
            <Empty title="Nothing scheduled" />
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Department attendance</h2>
              <p className="panel-subtitle">Present records by team</p>
            </div>
          </div>
          <div className="chart-box small">{s.departments.length ? <DepartmentChart rows={s.departments} /> : <Empty title="No data yet" />}</div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Recent activity</h2>
              <p className="panel-subtitle">Latest attendance updates</p>
            </div>
            <Link className="btn" href="/attendance">View all</Link>
          </div>
          {s.recent.length ? (
            s.recent.map((r) => (
              <div key={r.id} className="list-row">
                <Avatar name={r.fullName} />
                <div className="list-main">
                  <strong>{r.fullName}</strong>
                  <small>
                    {r.sessionTitle} · {formatTime(r.updatedAt)}
                  </small>
                </div>
                <div className="list-value">
                  <Badge value={r.status} />
                </div>
              </div>
            ))
          ) : (
            <Empty title="No activity yet" />
          )}
        </section>
      </div>
    </>
  );
}
