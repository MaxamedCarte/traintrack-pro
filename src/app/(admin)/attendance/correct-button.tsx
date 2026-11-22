"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { correctAttendanceAction } from "@/app/actions/admin";
import { ActionForm, Field } from "@/components/client/form";
import { Modal } from "@/components/client/modal";

export function CorrectButton({ id, name, session, status }: { id: string; name: string; session: string; status: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button className="row-actions" onClick={() => setOpen(true)} aria-label={`Correct attendance for ${name}`} title="Correct record">
        ⋯
      </button>
      {open ? (
        <Modal title="Attendance correction" onClose={() => setOpen(false)}>
          <ActionForm action={correctAttendanceAction} onCancel={() => setOpen(false)} onSuccess={() => { setOpen(false); router.refresh(); }} submitLabel="Save correction">
            {(errors) => (
              <>
                <input type="hidden" name="id" value={id} />
                <div className="alert alert-warning">
                  <strong>{name}</strong> · {session}
                  <br />
                  Current status: <strong>{status}</strong>
                </div>
                <Field label="New status" name="status">
                  <select id="status" name="status" className="form-control" defaultValue={status === "Present" ? "Absent" : "Present"}>
                    <option>Present</option>
                    <option>Absent</option>
                    <option value="reset">Reset record (delete)</option>
                  </select>
                </Field>
                <div style={{ marginTop: 14 }}>
                  <Field label="Reason (required, written to the audit log)" name="reason" error={errors.reason}>
                    <textarea id="reason" name="reason" className="form-control" />
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
