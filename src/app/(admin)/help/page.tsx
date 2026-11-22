import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Help" };

const STEPS = [
  ["Set up your directory", "Add departments and staff, or import a CSV from the Staff Directory. Each person needs a unique staff ID; they use it with their full name to check in."],
  ["Schedule a session", "Create a session with its audience, date, time, venue and QR rotation interval. Sessions start as Draft or Scheduled."],
  ["Go live at the venue", "Open QR Attendance, select the session and press Go live. Display the code on a screen. It rotates automatically and old codes stop working."],
  ["Staff check in", "Staff scan the code with their phone camera, enter their staff ID and full name, and confirm. Duplicate submissions are blocked."],
  ["Close the session", "Close the session when training ends. Anyone in the audience who did not check in is recorded as absent."],
  ["Correct & report", "Fix mistakes from Attendance Records. A reason is required and logged. Export filtered CSV or PDF reports from Reports & Analytics."],
];

export default async function HelpPage() {
  await requireAdmin();
  return (
    <>
      <PageHeading kicker="Support" title="Help & documentation" copy="How to run attendance with TrainTrack Pro" />
      <div className="session-grid">
        {STEPS.map(([title, body], i) => (
          <article key={title} className="session-card">
            <span className="session-id">Step {i + 1}</span>
            <h3>{title}</h3>
            <p className="help-copy">{body}</p>
          </article>
        ))}
      </div>
    </>
  );
}
