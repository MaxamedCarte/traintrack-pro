import Link from "next/link";

export default function NotFound() {
  return (
    <main className="checkin-shell">
      <div className="checkin-card">
        <div className="checkin-body center">
          <h1 style={{ fontFamily: "var(--font-grotesk)" }}>Page not found</h1>
          <p className="help-copy">The page you are looking for doesn&apos;t exist or has moved.</p>
          <Link className="btn btn-primary" href="/overview" style={{ justifyContent: "center" }}>Back to overview</Link>
        </div>
      </div>
    </main>
  );
}
