export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const formatDate = (value?: string | null) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "-";

export const formatTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "-";

export const formatDateTime = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "-";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const offsetISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell == null ? "" : String(cell);
          // Quote when needed and neutralise spreadsheet formula injection.
          const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
          return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(","),
    )
    .join("\n");
}
