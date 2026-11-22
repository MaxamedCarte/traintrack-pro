"use client";

import { useState } from "react";
import { useToast } from "@/components/client/toast";
import type { AttendanceRow } from "@/lib/data";

export function PdfButton({ query }: { query: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const generate = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/export/attendance?${query ? `${query}&` : ""}format=json`);
      if (!res.ok) throw new Error("Export failed");
      const data: { organization: string; generatedAt: string; total: number; present: number; absent: number; rows: AttendanceRow[] } = await res.json();
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      const header = () => {
        doc.setFillColor(14, 48, 55);
        doc.rect(0, 0, width, 64, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(`${data.organization} · Attendance report`, 40, 38);
        doc.setTextColor(30, 45, 51);
      };
      header();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated ${new Date(data.generatedAt).toLocaleString()}`, 40, 86);
      const filters = new URLSearchParams(query);
      const filterText = [...filters.entries()].map(([k, v]) => `${k}: ${v}`).join(" · ") || "No filters (all records)";
      doc.text(`Filters: ${filterText}`, 40, 100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const rate = data.total ? Math.round((data.present / data.total) * 100) : 0;
      doc.text(`Total ${data.total}    Present ${data.present}    Absent ${data.absent}    Rate ${rate}%`, 40, 122);

      const cols = [
        { label: "Staff ID", x: 40, w: 55 },
        { label: "Name", x: 98, w: 110 },
        { label: "Department", x: 210, w: 85 },
        { label: "Session", x: 297, w: 140 },
        { label: "Date", x: 440, w: 60 },
        { label: "Status", x: 505, w: 50 },
      ];
      let y = 150;
      const head = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setFillColor(240, 245, 244);
        doc.rect(36, y - 11, width - 72, 16, "F");
        cols.forEach((c) => doc.text(c.label.toUpperCase(), c.x, y));
        y += 16;
        doc.setFont("helvetica", "normal");
      };
      head();
      for (const r of data.rows) {
        if (y > height - 50) {
          doc.addPage();
          header();
          y = 96;
          head();
        }
        const values = [r.staffId, r.fullName, r.department, r.sessionTitle, r.sessionDate, r.status];
        cols.forEach((c, i) => doc.text(doc.splitTextToSize(String(values[i] ?? ""), c.w)[0] ?? "", c.x, y));
        y += 14;
      }
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 135, 140);
        doc.text(`Page ${i} of ${pages}`, width - 90, height - 24);
      }
      doc.save(`traintrack-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast("PDF report generated.");
    } catch {
      toast("Could not generate the PDF report.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="btn btn-primary" onClick={generate} disabled={busy}>
      {busy ? "Generating…" : "📄 Generate PDF"}
    </button>
  );
}
