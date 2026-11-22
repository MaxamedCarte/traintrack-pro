import type { Metadata } from "next";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import { verifyCheckinToken } from "@/lib/qr-token";
import { formatDate } from "@/lib/format";
import { getSettings } from "@/lib/data";
import { TrainingSession } from "@/models";
import { CheckinForm } from "./checkin-form";

export const metadata: Metadata = { title: "Check in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claims = await verifyCheckinToken(token);
  await connectDB();
  const session = claims ? await TrainingSession.findOne({ code: claims.sessionCode }).lean() : null;
  const settings = await getSettings();
  const valid = !!session && session.status === "Live" && (session.qrVersion ?? 1) === claims?.version;

  return (
    <main className="checkin-shell">
      <div className="checkin-card">
        <div className="checkin-head">
          <div className="brand-inline">
            <Image src="/logo.svg" alt="" width={30} height={30} />
            <strong style={{ fontSize: 15 }}>{settings.organization}</strong>
          </div>
          <h1>{valid ? session!.title : "Training check-in"}</h1>
          <p>{valid ? [formatDate(session!.date), `${session!.start}–${session!.end}`, session!.venue].filter(Boolean).join(" · ") : "Attendance confirmation"}</p>
        </div>
        <div className="checkin-body">
          {valid ? (
            <CheckinForm token={token} />
          ) : (
            <div className="center">
              <div className="success-mark" style={{ background: "#fff3de", color: "#956b22" }}>!</div>
              <h2 style={{ fontFamily: "var(--font-grotesk)", fontSize: 18 }}>This code is no longer valid</h2>
              <p className="help-copy">QR codes rotate every few minutes. Please scan the code currently displayed at the venue, or ask the facilitator for help.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
