"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSessionAction, saveSessionAction, setSessionStatusAction } from "@/app/actions/admin";
import { ActionForm, Field } from "@/components/client/form";
import { Modal } from "@/components/client/modal";
import { useToast } from "@/components/client/toast";
import { Badge, Empty } from "@/components/ui";
import { SESSION_STATUSES, type SessionStatus } from "@/lib/constants";
import type { SessionDTO } from "@/lib/data";
import { formatDate, offsetISO } from "@/lib/format";

type Row = SessionDTO & { recorded: number; present: number; expected: number };

export function SessionsClient({ sessions, departments, defaultQrExpiry, openNew, statusFilter }: { sessions: Row[]; departments: string[]; defaultQrExpiry: number; openNew: boolean; statusFilter: string }) {
  const [editing, setEditing] = useState<Partial<SessionDTO> | null>(openNew ? {} : null);
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [suggestedCode] = useState(() => `TRN-${String(Date.now()).slice(-5)}`);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok ? "success" : "error");
      router.refresh();
    });

  const close = () => {
    setEditing(null);
    if (openNew) router.replace("/sessions");
  };

  return (
    <>
      <div className="filter-bar">
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => router.push(e.target.value === "all" ? "/sessions" : `/sessions?status=${e.target.value}`)}>
          <option value="all">All statuses</option>
          {SESSION_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="btn">{sessions.length} sessions</span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setEditing({})}>
          + New training session
        </button>
      </div>
      {sessions.length === 0 ? (
        <div className="table-wrap">
          <Empty title="No sessions yet">Create your first training session to start collecting attendance.</Empty>
        </div>
      ) : (
        <div className="session-grid">
          {sessions.map((s) => (
            <article key={s.code} className="session-card">
              <div className="card-top">
                <span className="session-id">{s.code}</span>
                <Badge value={s.status} />
              </div>
              <h3>{s.title}</h3>
              <p>Facilitated by {s.trainer || "—"}</p>
              <div className="session-meta">
                <span>📅 {formatDate(s.date)}</span>
                <span>◷ {s.start} – {s.end}</span>
                <span>⌾ {s.venue || "—"}</span>
              </div>
              <div className="session-progress">
                <i style={{ width: `${s.expected ? Math.min(100, (s.present / s.expected) * 100) : 0}%` }} />
              </div>
              <small className="muted">
                {s.present} present · {s.recorded} recorded of {s.expected} expected
              </small>
              <div className="card-footer">
                <small>{s.department}</small>
                <div className="inline-actions">
                  <button className="btn btn-sm" onClick={() => setEditing(s)}>Edit</button>
                  {s.status !== "Live" && s.status !== "Completed" && s.status !== "Cancelled" ? (
                    <button className="btn btn-sm" disabled={pending} onClick={() => run(() => setSessionStatusAction(s.code, "Live"))}>Go live</button>
                  ) : null}
                  {s.recorded === 0 && s.status !== "Live" ? (
                    <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => confirm(`Delete ${s.title}?`) && run(() => deleteSessionAction(s.code))}>Delete</button>
                  ) : null}
                  <Link className="btn btn-sm btn-teal" href={`/qr?session=${s.code}`}>QR</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing ? (
        <Modal title={editing.code ? "Edit training session" : "Create training session"} onClose={close}>
          <ActionForm action={saveSessionAction} onSuccess={() => { close(); router.refresh(); }} onCancel={close}>
            {(errors) => (
              <div className="form-grid">
                <input type="hidden" name="original" value={editing.code ?? ""} />
                <Field full label="Training title" name="title" defaultValue={editing.title} error={errors.title} required />
                <Field label="Session ID" name="code" defaultValue={editing.code ?? suggestedCode} readOnly={!!editing.code} error={errors.code} />
                <Field label="Trainer" name="trainer" defaultValue={editing.trainer} error={errors.trainer} />
                <Field label="Date" name="date" type="date" defaultValue={editing.date ?? offsetISO(7)} error={errors.date} />
                <Field label="Venue" name="venue" defaultValue={editing.venue} error={errors.venue} />
                <Field label="Start time" name="start" type="time" defaultValue={editing.start ?? "09:00"} error={errors.start} />
                <Field label="End time" name="end" type="time" defaultValue={editing.end ?? "10:00"} error={errors.end} />
                <Field label="Audience" name="department" error={errors.department}>
                  <select id="department" name="department" className="form-control" defaultValue={editing.department ?? "All departments"}>
                    <option>All departments</option>
                    {departments.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status" name="status" error={errors.status}>
                  <select id="status" name="status" className="form-control" defaultValue={(editing.status as SessionStatus) ?? "Scheduled"}>
                    {SESSION_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="QR rotation (minutes)" name="qrExpiryMinutes" type="number" min={1} max={120} defaultValue={editing.qrExpiryMinutes ?? defaultQrExpiry} error={errors.qrExpiryMinutes} />
              </div>
            )}
          </ActionForm>
        </Modal>
      ) : null}
    </>
  );
}
