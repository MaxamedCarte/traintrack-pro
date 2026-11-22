import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listAudit } from "@/lib/data";
import { LocalTime } from "@/components/client/local-time";
import { Empty, PageHeading, Pagination } from "@/components/ui";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const data = await listAudit(page);
  return (
    <>
      <PageHeading kicker="Governance" title="Audit logs" copy="An append-only record of administrative changes" />
      <div className="table-wrap">
        {data.rows.length === 0 ? (
          <Empty title="No administrative changes yet">Corrections, imports and configuration changes will appear here.</Empty>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>When</th><th>Action</th><th>Target</th><th>Change</th><th>Reason</th><th>Administrator</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td><LocalTime value={r.createdAt} mode="datetime" /></td>
                      <td><span className="badge live">{r.action}</span></td>
                      <td><strong>{r.summary || r.entityId}</strong><br /><small className="muted">{r.entity}{r.entityId ? ` · ${r.entityId}` : ""}</small></td>
                      <td className="audit-diff">{r.oldValue || r.newValue ? <><b>{r.oldValue || "—"}</b> → <b>{r.newValue || "—"}</b></> : "—"}</td>
                      <td style={{ whiteSpace: "normal", maxWidth: 260 }}>{r.reason || "—"}</td>
                      <td>{r.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} hrefFor={(p) => `/audit?page=${p}`} />
          </>
        )}
      </div>
    </>
  );
}
