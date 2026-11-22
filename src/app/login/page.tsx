import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/overview");
  const { next } = await searchParams;
  return (
    <div className="login-shell">
      <section className="login-hero">
        <div className="brand-inline">
          <Image src="/logo.svg" alt="" width={36} height={36} priority />
          <strong>TrainTrack Pro</strong>
        </div>
        <div>
          <h1>Training attendance your auditors will trust.</h1>
          <p>Schedule sessions, run rotating QR check-ins validated on the server, and export clean reports, with every correction on the record.</p>
          <ul>
            <li>Signed, expiring QR challenges per session</li>
            <li>One record per person per session, enforced by the database</li>
            <li>Reason-required corrections with a full audit log</li>
          </ul>
        </div>
        <small style={{ color: "#6f8f8f" }}>© {new Date().getFullYear()} TrainTrack Pro</small>
      </section>
      <section className="login-card">
        <h2>Administrator sign in</h2>
        <p className="panel-subtitle">Use the credentials provided by your workspace owner.</p>
        <LoginForm next={next} />
      </section>
    </div>
  );
}
