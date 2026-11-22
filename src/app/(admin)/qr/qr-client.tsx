"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState, useTransition } from "react";
import { closeSessionAction, issueQrTokenAction, manualAttendanceAction, revokeQrAction, setSessionStatusAction } from "@/app/actions/admin";
import { ActionForm, Field } from "@/components/client/form";
import { Modal } from "@/components/client/modal";
import { useToast } from "@/components/client/toast";
import { Avatar, Badge } from "@/components/ui";
import type { AttendanceDTO, SessionDTO, StaffDTO } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { LocalTime } from "@/components/client/local-time";

type RosterRow = StaffDTO & { record: AttendanceDTO | null };

export function QrClient({ origin, session, sessions, roster, expected, present, absent }: {
  origin: string;
  session: SessionDTO;
  sessions: { code: string; title: string; status: string }[];
  roster: RosterRow[];
  expected: number;
  present: number;
  absent: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [qr, setQr] = useState<{ url: string; image: string; expiresAt: number } | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [manual, setManual] = useState<RosterRow | null>(null);
  const live = session.status === "Live";

  const [rotateKey, setRotateKey] = useState(0);
  const rotateNow = () => setRotateKey((k) => k + 1);

  // Issue a signed token, render it, and schedule the next rotation shortly before expiry.
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const issue = async () => {
      const r = await issueQrTokenAction(session.code);
      if (cancelled) return;
      if (!r.ok) {
        setQr(null);
        setError(r.message);
        return;
      }
      const url = `${origin}/checkin/${r.token}`;
      const image = await QRCode.toDataURL(url, { margin: 1, width: 376, errorCorrectionLevel: "M", color: { dark: "#0e3037", light: "#ffffff" } });
      if (cancelled) return;
      setError("");
      setQr({ url, image, expiresAt: r.expiresAt });
      timer = setTimeout(issue, Math.max(5000, r.expiresAt - Date.now() - 3000));
    };
    void issue();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [live, origin, session.code, rotateKey]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Keep roster fresh while the session is live.
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [live, router]);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok ? "success" : "error");
      after?.();
      router.refresh();
    });

  const shown = live ? qr : null;
  const remaining = shown ? Math.max(0, Math.floor((shown.expiresAt - now) / 1000)) : 0;
  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <>
      <div className="qr-layout">
        <section className="qr-stage">
          <div className="qr-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shown ? <img src={shown.image} alt={`Check-in QR code for ${session.title}`} /> : <div className="qr-fallback" style={{ opacity: 0.25 }} />}
          </div>
          <h2>{session.title}</h2>
          <p>
            {formatDate(session.date)} · {session.start} – {session.end} · {session.venue}
          </p>
          {shown ? (
            <>
              <div className="countdown">Rotates in {mmss}</div>
              <small style={{ color: "#809a99", marginTop: 7 }}>Signed server challenge · old codes stop working on rotation</small>
            </>
          ) : (
            <div className="countdown" style={{ color: "#e0a268" }}>{error || "Session is not live"}</div>
          )}
        </section>
        <section className="qr-side">
          <div className="qr-info">
            <h3>Live session control</h3>
            <select className="form-control" value={session.code} onChange={(e) => router.push(`/qr?session=${e.target.value}`)} aria-label="Select session">
              {sessions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.title} ({s.status})
                </option>
              ))}
            </select>
            <div className={`alert ${live ? "alert-success" : "alert-warning"}`}>
              {live
                ? "Accepting check-ins. Staff confirm with their staff ID and full name, validated on the server."
                : session.status === "Completed"
                  ? "This session is closed. Reopen it to accept more check-ins."
                  : `This session is ${session.status}. Go live to start accepting check-ins.`}
            </div>
            <div className="inline-actions" style={{ marginBottom: 14 }}>
              {!live ? (
                <button className="btn btn-primary" disabled={pending || session.status === "Cancelled"} onClick={() => run(() => setSessionStatusAction(session.code, "Live"))}>
                  ▶ {session.status === "Completed" ? "Reopen & go live" : "Go live"}
                </button>
              ) : (
                <>
                  <button className="btn btn-primary" disabled={pending} onClick={() => confirm("Close the session and mark everyone not checked in as absent?") && run(() => closeSessionAction(session.code))}>
                    ■ Close session
                  </button>
                  <button className="btn" disabled={pending} onClick={() => run(() => revokeQrAction(session.code), rotateNow)}>⟳ Revoke &amp; rotate</button>
                  {shown ? (
                    <button className="btn" onClick={() => { void navigator.clipboard?.writeText(shown.url); toast("Check-in link copied."); }}>Copy link</button>
                  ) : null}
                </>
              )}
            </div>
            <dl>
              <dt>Session ID</dt><dd>{session.code}</dd>
              <dt>Audience</dt><dd>{session.department}</dd>
              <dt>Recorded</dt><dd>{present + absent} / {expected}</dd>
              <dt>Present</dt><dd>{present}</dd>
              <dt>Absent</dt><dd>{absent}</dd>
            </dl>
          </div>
          <div className="qr-info">
            <h3>Roster</h3>
            <div className="roster">
              {roster.map((p) => (
                <div key={p.staffId} className="list-row">
                  <Avatar name={p.fullName} />
                  <div className="list-main">
                    <strong>{p.fullName}</strong>
                    <small>{p.staffId} · {p.record?.checkIn ? <>checked in <LocalTime value={p.record.checkIn} /></> : p.department}</small>
                  </div>
                  <div className="list-value">
                    {p.record ? <Badge value={p.record.status} /> : <button className="btn btn-sm" onClick={() => setManual(p)}>Record</button>}
                  </div>
                </div>
              ))}
              {roster.length === 0 ? <p className="panel-subtitle">No active staff in this audience.</p> : null}
            </div>
          </div>
        </section>
      </div>
      {manual ? (
        <Modal title={`Record attendance · ${manual.fullName}`} onClose={() => setManual(null)}>
          <ActionForm action={manualAttendanceAction} onCancel={() => setManual(null)} onSuccess={() => { setManual(null); router.refresh(); }} submitLabel="Record attendance">
            {(errors) => (
              <>
                <input type="hidden" name="sessionCode" value={session.code} />
                <input type="hidden" name="staffId" value={manual.staffId} />
                <div className="choice-grid">
                  <div className="choice"><input type="radio" name="status" value="Present" id="m-present" defaultChecked /><label htmlFor="m-present">✓ Present</label></div>
                  <div className="choice"><input type="radio" name="status" value="Absent" id="m-absent" /><label htmlFor="m-absent">✗ Absent</label></div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Field label="Reason (recorded in audit log)" name="reason" error={errors.reason}>
                    <textarea id="reason" name="reason" className="form-control" placeholder="e.g. Phone unavailable, verified by facilitator" />
                  </Field>
                </div>
              </>
            )}
          </ActionForm>
        </Modal>
      ) : null}
    </>
  );
}
