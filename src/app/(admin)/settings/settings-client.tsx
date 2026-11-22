"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { addAdminAction, changePasswordAction, loadDemoDataAction, saveSettingsAction } from "@/app/actions/admin";
import { ActionForm, Field } from "@/components/client/form";
import { useToast } from "@/components/client/toast";

type AdminRow = { id: string; name: string; email: string; role: string; lastLogin: string };

export function SettingsClient({ settings, me, admins }: { settings: { organization: string; defaultQrExpiryMinutes: number }; me: { id: string }; admins: AdminRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  return (
    <div className="settings-grid">
      <section className="panel">
        <h2 className="panel-title">Organization</h2>
        <p className="panel-subtitle">Shown in the navigation, on check-in pages and in reports.</p>
        <ActionForm action={saveSettingsAction} onSuccess={() => router.refresh()}>
          {(errors) => (
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field full label="Organization name" name="organization" defaultValue={settings.organization} error={errors.organization} />
              <Field label="Default QR rotation (minutes)" name="defaultQrExpiryMinutes" type="number" min={1} max={120} defaultValue={settings.defaultQrExpiryMinutes} error={errors.defaultQrExpiryMinutes} />
            </div>
          )}
        </ActionForm>
      </section>

      <section className="panel">
        <h2 className="panel-title">Change your password</h2>
        <ActionForm action={changePasswordAction} resetOnSuccess submitLabel="Update password">
          {(errors) => (
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field full label="Current password" name="current" type="password" autoComplete="current-password" error={errors.current} />
              <Field label="New password" name="next" type="password" autoComplete="new-password" error={errors.next} />
              <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={errors.confirm} />
            </div>
          )}
        </ActionForm>
      </section>

      <section className="panel">
        <h2 className="panel-title">Administrators</h2>
        {admins.map((a) => (
          <div key={a.id} className="setting-row">
            <span>
              <strong>{a.name} {a.id === me.id ? <span className="muted">(you)</span> : null}</strong>
              <small>{a.email} · {a.role} · last sign-in {a.lastLogin}</small>
            </span>
          </div>
        ))}
        <h3 className="panel-title" style={{ marginTop: 18, fontSize: 13 }}>Add administrator</h3>
        <ActionForm action={addAdminAction} resetOnSuccess submitLabel="Add administrator" onSuccess={() => router.refresh()}>
          {(errors) => (
            <div className="form-grid" style={{ marginTop: 10 }}>
              <Field label="Name" name="name" error={errors.name} />
              <Field label="Email" name="email" type="email" error={errors.email} />
              <Field full label="Temporary password" name="password" type="password" autoComplete="new-password" error={errors.password} />
            </div>
          )}
        </ActionForm>
      </section>

      <section className="panel">
        <h2 className="panel-title">Demo data</h2>
        <p className="help-copy">Loads fictional staff, departments, sessions and attendance for evaluation. Existing records with the same IDs are left untouched.</p>
        <button
          className="btn"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await loadDemoDataAction();
              toast(r.message, r.ok ? "success" : "error");
              router.refresh();
            })
          }
        >
          {pending ? "Loading…" : "Load demo data"}
        </button>
        <h2 className="panel-title" style={{ marginTop: 22 }}>Security model</h2>
        <p className="help-copy">
          QR codes carry a signed token bound to one session that expires on rotation and is revoked whenever the session status changes. Check-ins are validated on the server against an active staff profile, rate-limited per device, and the database enforces one record per person per session. A QR can still be forwarded during its lifetime, so pair it with facilitator oversight for high-stakes training.
        </p>
      </section>
    </div>
  );
}
