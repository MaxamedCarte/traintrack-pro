"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/validation";
import { useToast } from "./toast";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** Wraps a server action with pending state, inline field errors and toasts. */
export function ActionForm({
  action,
  children,
  onSuccess,
  submitLabel = "Save",
  onCancel,
  resetOnSuccess = false,
}: {
  action: Action;
  children: (errors: Record<string, string>) => ReactNode;
  onSuccess?: () => void;
  submitLabel?: string;
  onCancel?: () => void;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    toast(state.message, state.ok ? "success" : "error");
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form onSubmit={(e) => submitPreservingInputs(e, formAction)} ref={ref} noValidate>
      {state.ok === false && state.message && !state.errors ? <div className="alert alert-error">{state.message}</div> : null}
      {children(state.errors ?? {})}
      <div className="modal-foot" style={{ padding: "16px 0 0", border: 0 }}>
        {onCancel ? (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/**
 * React 19 resets uncontrolled inputs after a form action completes. Dispatching
 * from onSubmit keeps what the user typed when validation fails.
 */
export function submitPreservingInputs(e: FormEvent<HTMLFormElement>, dispatch: (form: FormData) => void) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  startTransition(() => dispatch(data));
}

export function Field({
  label,
  name,
  error,
  full,
  children,
  ...input
}: {
  label: string;
  name: string;
  error?: string;
  full?: boolean;
  children?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`form-field${full ? " full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {children ?? <input id={name} name={name} className={`form-control${error ? " invalid" : ""}`} aria-invalid={!!error} {...input} />}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
