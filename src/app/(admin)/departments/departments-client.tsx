"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteDepartmentAction, saveDepartmentAction } from "@/app/actions/admin";
import { ActionForm, Field } from "@/components/client/form";
import { Modal } from "@/components/client/modal";
import { useToast } from "@/components/client/toast";
import { Empty } from "@/components/ui";
import type { DepartmentDTO } from "@/lib/data";

export function DepartmentsClient({ departments }: { departments: DepartmentDTO[] }) {
  const [editing, setEditing] = useState<Partial<DepartmentDTO> | null>(null);
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const remove = (name: string) =>
    start(async () => {
      if (!confirm(`Delete ${name}?`)) return;
      const r = await deleteDepartmentAction(name);
      toast(r.message, r.ok ? "success" : "error");
      router.refresh();
    });

  return (
    <>
      <div className="filter-bar">
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setEditing({})}>+ Add department</button>
      </div>
      {departments.length === 0 ? (
        <div className="table-wrap"><Empty title="No departments yet" /></div>
      ) : (
        <div className="session-grid">
          {departments.map((d) => (
            <article key={d.name} className="session-card">
              <span className="session-id">{d.staffCount} staff</span>
              <h3>{d.name}</h3>
              <p>{d.description || "No description"}</p>
              <div className="card-footer">
                <Link className="btn btn-sm" href={`/staff?department=${encodeURIComponent(d.name)}`}>View people</Link>
                <div className="inline-actions">
                  <button className="btn btn-sm" onClick={() => setEditing(d)}>Edit</button>
                  {d.staffCount === 0 ? <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => remove(d.name)}>Delete</button> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing ? (
        <Modal title={editing.name ? "Edit department" : "Add department"} onClose={() => setEditing(null)}>
          <ActionForm action={saveDepartmentAction} onCancel={() => setEditing(null)} onSuccess={() => { setEditing(null); router.refresh(); }}>
            {(errors) => (
              <div className="form-grid">
                <input type="hidden" name="original" value={editing.name ?? ""} />
                <Field full label="Name" name="name" defaultValue={editing.name} error={errors.name} />
                <Field full label="Description" name="description" defaultValue={editing.description} error={errors.description} />
              </div>
            )}
          </ActionForm>
        </Modal>
      ) : null}
    </>
  );
}
