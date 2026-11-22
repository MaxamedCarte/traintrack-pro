"use client";

import { useActionState } from "react";
import { submitPreservingInputs } from "@/components/client/form";
import { checkinAction, type CheckinState } from "@/app/actions/checkin";
import { formatTime } from "@/lib/format";

export function CheckinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<CheckinState, FormData>(checkinAction, {});

  if (state.ok) {
    return (
      <div className="center">
        <div className="success-mark">{state.already ? "i" : "✓"}</div>
        <h2 style={{ fontFamily: "var(--font-grotesk)", fontSize: 19, margin: "6px 0" }}>{state.already ? "Already checked in" : `Thanks, ${state.name?.split(" ")[0]}!`}</h2>
        <p className="help-copy">{state.already ? state.message : `You're marked present at ${formatTime(state.time)}. You can close this page.`}</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => submitPreservingInputs(e, action)} noValidate style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="token" value={token} />
      <p className="help-copy" style={{ margin: 0 }}>Confirm your identity to record your attendance for this session.</p>
      {state.message ? <div className="alert alert-error" role="alert">{state.message}</div> : null}
      <div className="form-field">
        <label htmlFor="staffId">Staff ID</label>
        <input id="staffId" name="staffId" className="form-control" placeholder="e.g. ST-0101" autoComplete="off" autoCapitalize="characters" required />
        {state.errors?.staffId ? <span className="field-error">{state.errors.staffId}</span> : null}
      </div>
      <div className="form-field">
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" className="form-control" placeholder="As shown in the staff directory" autoComplete="name" required />
        {state.errors?.fullName ? <span className="field-error">{state.errors.fullName}</span> : null}
      </div>
      <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", height: 44, fontSize: 14 }} disabled={pending}>
        {pending ? "Confirming…" : "✓ Confirm I'm present"}
      </button>
      <small className="muted center">Your check-in is time-stamped and can only be submitted once.</small>
    </form>
  );
}

