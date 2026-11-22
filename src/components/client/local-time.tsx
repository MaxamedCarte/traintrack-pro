"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, formatTime } from "@/lib/format";

const subscribe = () => () => {};

/**
 * Formats timestamps in the viewer's timezone. The server (UTC on Vercel) renders a
 * placeholder and the client fills it in after hydration, so markup never mismatches.
 */
export function LocalTime({ value, mode = "time" }: { value?: string | null; mode?: "time" | "datetime" | "date-long" | "greeting" }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return <span aria-hidden>{mode === "greeting" ? "Hello" : " "}</span>;
  if (mode === "greeting") {
    const h = new Date().getHours();
    return <>{h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}</>;
  }
  if (mode === "date-long") return <>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</>;
  if (!value) return <>-</>;
  return <time dateTime={value}>{mode === "datetime" ? formatDateTime(value) : formatTime(value)}</time>;
}
