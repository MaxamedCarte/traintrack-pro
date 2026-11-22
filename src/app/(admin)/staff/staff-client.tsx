"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importStaffAction, saveStaffAction, toggleStaffStatusAction, type ImportRow } from "@/app/actions/admin";
import { SearchInput, SelectFilter } from "@/components/client/filter-bar";
import { ActionForm, Field } from "@/components/client/form";
import { Modal } from "@/components/client/modal";
import { useToast } from "@/components/client/toast";
import { Avatar, Badge, Empty } from "@/components/ui";
import { parseCsv } from "@/lib/csv-parse";
import type { StaffDTO } from "@/lib/data";

export function StaffClient({ staff, departments, sessionCounts, filters }: { staff: StaffDTO[]; departments: string[]; sessionCounts: Record<string, number>; filters: { q: string; department: string; status: string } }) {
  const [editing, setEditing] = useState<Partial<StaffDTO> | null>(null);
  const [importing, setImporting] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const toggle = (p: StaffDTO) =>
    start(async () => {
      if (!confirm(`${p.status === "active" ? "Deactivate" : "Reactivate"} ${p.fullName}?`)) return;
      const r = await toggleStaffStatusAction(p.staffId);
      toast(r.message, r.ok ? "success" : "error");
      router.refresh();
    });

  return (
    <>
      <div className="filter-bar">
        <SearchInput name="q" placeholder="Search name, ID or title" initial={filters.q} />
        <SelectFilter name="department" label="Department" value={filters.department} options={[{ value: "all", label: "All departments" }, ...departments.map((d) => ({ value: d, label: d }))]} />
        <SelectFilter name="status" label="Status" value={filters.status} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        <span className="btn">{staff.length} results</span>
        <div className="inline-actions" style={{ marginLeft: "auto" }}>
          <a className="btn" href="/sample-staff.csv" download="traintrack-staff-template.csv">↓ CSV template</a>
          <button className="btn" onClick={() => setImporting(true)}>↑ Import CSV</button>
          <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add staff member</button>
        </div>
      </div>
      <div className="table-wrap">
        {staff.length === 0 ? (
          <Empty title="No staff match these filters" />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Department</th>
                  <th>Job title</th>
                  <th>Status</th>
                  <th>Sessions</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((p) => (
                  <tr key={p.staffId}>
                    <td>
                      <div className="staff-cell">
                        <Avatar name={p.fullName} />
                        <div>
                          <strong>{p.fullName}</strong>
                          <small>{p.staffId}</small>
                        </div>
                      </div>
                    </td>
                    <td>{p.department}</td>
                    <td>{p.jobTitle}</td>
                    <td><Badge value={p.status} /></td>
                    <td>{sessionCounts[p.staffId] ?? 0}</td>
                    <td className="text-right">
                      <div className="inline-actions" style={{ justifyContent: "flex-end" }}>
                        <button className="btn btn-sm" onClick={() => setEditing(p)}>Edit</button>
                        <Link className="btn btn-sm" href={`/staff/${p.staffId}`}>History</Link>
                        <button className={`btn btn-sm${p.status === "active" ? " btn-danger" : ""}`} disabled={pending} onClick={() => toggle(p)}>
                          {p.status === "active" ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing ? (
        <Modal title={editing.staffId ? "Edit staff profile" : "Add staff member"} onClose={() => setEditing(null)}>
          <ActionForm action={saveStaffAction} onSuccess={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)}>
            {(errors) => (
              <div className="form-grid">
                <input type="hidden" name="original" value={editing.staffId ?? ""} />
                <Field label="Staff ID" name="staffId" defaultValue={editing.staffId} readOnly={!!editing.staffId} placeholder="ST-0123" error={errors.staffId} />
                <Field label="Full name" name="fullName" defaultValue={editing.fullName} error={errors.fullName} />
                <Field label="Department" name="department" error={errors.department}>
                  <input id="department" name="department" list="dept-list" className="form-control" defaultValue={editing.department ?? departments[0] ?? ""} />
                  <datalist id="dept-list">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Job title" name="jobTitle" defaultValue={editing.jobTitle} error={errors.jobTitle} />
                <Field label="Status" name="status">
                  <select id="status" name="status" className="form-control" defaultValue={editing.status ?? "active"}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>
            )}
          </ActionForm>
        </Modal>
      ) : null}

      {importing ? <ImportModal onClose={() => setImporting(false)} onDone={() => { setImporting(false); router.refresh(); }} /> : null}
    </>
  );
}

const HEADERS = ["staffId", "fullName", "department", "jobTitle", "status"] as const;

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  const onFile = async (file?: File) => {
    setError("");
    setRows([]);
    if (!file) return;
    if (file.size > 1_000_000) return setError("File is larger than 1 MB.");
    const [header, ...body] = parseCsv(await file.text());
    const index = HEADERS.map((h) => header?.findIndex((c) => c.trim().toLowerCase() === h.toLowerCase()) ?? -1);
    if (index.slice(0, 3).some((i) => i < 0)) return setError("CSV must include staffId, fullName and department columns.");
    setRows(body.map((r) => Object.fromEntries(HEADERS.map((h, i) => [h, (index[i] >= 0 ? r[index[i]] : "")?.trim() ?? ""])) as ImportRow));
  };

  const submit = () =>
    start(async () => {
      const r = await importStaffAction(rows);
      if (r.ok) {
        toast(r.message);
        onDone();
      } else setError(r.message);
    });

  return (
    <Modal
      title="Import staff from CSV"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!rows.length || pending} onClick={submit}>
            {pending ? "Importing…" : `Import ${rows.length || ""} rows`}
          </button>
        </>
      }
    >
      <p className="help-copy">Columns: staffId, fullName, department, jobTitle, status. Existing staff IDs are updated; new IDs are added.</p>
      <input type="file" accept=".csv,text/csv" className="form-control" style={{ paddingTop: 7 }} onChange={(e) => onFile(e.target.files?.[0])} />
      {error ? <div className="alert alert-error">{error}</div> : null}
      {rows.length ? (
        <div className="import-preview">
          <table>
            <thead>
              <tr>{HEADERS.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i}>{HEADERS.map((h) => <td key={h}>{r[h]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {rows.length > 50 ? <p className="panel-subtitle">Showing 50 of {rows.length} rows.</p> : null}
    </Modal>
  );
}
