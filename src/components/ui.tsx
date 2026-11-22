import type { ReactNode } from "react";
import Link from "next/link";

export function Badge({ value }: { value: string }) {
  return <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

export function PageHeading({ kicker, title, copy, actions }: { kicker: ReactNode; title: ReactNode; copy?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        {copy ? <p>{copy}</p> : null}
      </div>
      {actions ? <div className="heading-actions">{actions}</div> : null}
    </div>
  );
}

export function Kpi({ label, value, foot, icon, tone = "" }: { label: string; value: ReactNode; foot: string; icon: string; tone?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        <span className="kpi-icon" aria-hidden>{icon}</span>
      </div>
      <div className={`kpi-value ${tone}`}>{value}</div>
      <div className="kpi-foot">{foot}</div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-panel">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Pagination({ page, pages, total, hrefFor }: { page: number; pages: number; total: number; hrefFor: (p: number) => string }) {
  return (
    <div className="pagination">
      <span>
        Page {page} of {pages} · {total} records
      </span>
      <div className="page-buttons">
        <Link className={page <= 1 ? "disabled" : ""} href={hrefFor(page - 1)} aria-disabled={page <= 1}>
          ‹ Prev
        </Link>
        <Link className={page >= pages ? "disabled" : ""} href={hrefFor(page + 1)} aria-disabled={page >= pages}>
          Next ›
        </Link>
      </div>
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const text = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <span className="list-avatar">{text}</span>;
}

/** Builds a query string preserving existing params. */
export function withParams(base: string, params: Record<string, string | undefined>, patch: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v !== undefined && v !== "" && v !== "all") sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
