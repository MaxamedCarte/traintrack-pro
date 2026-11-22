"use client";

import { useActionState } from "react";
import { submitPreservingInputs } from "@/components/client/form";
import { loginAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form onSubmit={(e) => submitPreservingInputs(e, action)} noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state.message ? <div className="alert alert-error" role="alert">{state.message}</div> : null}
      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" className="form-control" required />
        {state.errors?.email ? <span className="field-error">{state.errors.email}</span> : null}
      </div>
      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="form-control" required />
        {state.errors?.password ? <span className="field-error">{state.errors.password}</span> : null}
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 20, height: 40 }} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

