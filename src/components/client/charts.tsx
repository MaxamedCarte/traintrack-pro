"use client";

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

const TEAL = "#5fae9b";
const ORANGE = "#db8a4d";
const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 11 } } } } } as const;

export function TrendChart({ labels, present, absent }: { labels: string[]; present: number[]; absent: number[] }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          { label: "Present", data: present, borderColor: TEAL, backgroundColor: "rgba(95,174,155,.12)", fill: true, tension: 0.35, pointRadius: 0 },
          { label: "Absent", data: absent, borderColor: ORANGE, tension: 0.35, pointRadius: 0 },
        ],
      }}
      options={{ ...base, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 8 } } } }}
    />
  );
}

export function StatusChart({ present, absent }: { present: number; absent: number }) {
  return (
    <Doughnut
      data={{ labels: ["Present", "Absent"], datasets: [{ data: [present, absent], backgroundColor: [TEAL, ORANGE], borderWidth: 0 }] }}
      options={{ ...base, cutout: "68%" }}
    />
  );
}

export function DepartmentChart({ rows, stacked = false }: { rows: { name: string; present: number; total: number }[]; stacked?: boolean }) {
  return (
    <Bar
      data={{
        labels: rows.map((r) => r.name),
        datasets: stacked
          ? [
              { label: "Present", data: rows.map((r) => r.present), backgroundColor: TEAL },
              { label: "Absent", data: rows.map((r) => r.total - r.present), backgroundColor: ORANGE },
            ]
          : [{ label: "Present", data: rows.map((r) => r.present), backgroundColor: TEAL }],
      }}
      options={{ ...base, plugins: { legend: { display: stacked } }, scales: { x: { stacked }, y: { stacked, beginAtZero: true, ticks: { precision: 0 } } } }}
    />
  );
}
