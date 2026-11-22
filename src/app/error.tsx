"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="checkin-shell">
      <div className="checkin-card">
        <div className="checkin-body center">
          <h1 style={{ fontFamily: "var(--font-grotesk)" }}>Something went wrong</h1>
          <p className="help-copy">We couldn&apos;t complete that request. If this keeps happening, check that the database is reachable.</p>
          <button className="btn btn-primary" onClick={reset} style={{ justifyContent: "center" }}>Try again</button>
        </div>
      </div>
    </main>
  );
}
