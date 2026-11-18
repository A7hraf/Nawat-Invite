"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/errors";

export function SubmitButton({ children, className = "btn btn-primary", pending, ...rest }: { children: ReactNode; className?: string; pending?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={busy || rest.disabled} aria-busy={busy} {...rest}>
      {busy ? pending ?? "Saving…" : children}
    </button>
  );
}

export function Message({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <div className="notice bad" role="alert">{state.error}</div>;
  if (state.ok) return <div className="notice ok" role="status">{state.ok}</div>;
  return null;
}

/** A form bound to a server action, showing its success/error message. */
export function ActionForm({ action, children, className = "stack", resetOnOk = false, id }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>; children: ReactNode; className?: string; resetOnOk?: boolean; id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnOk && state?.ok) ref.current?.reset(); }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className} id={id}>
      <Message state={state} />
      {children}
    </form>
  );
}

export function Switch({ name, defaultChecked, disabled, label }: { name: string; defaultChecked?: boolean; disabled?: boolean; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} disabled={disabled} aria-label={label} />
      <span />
    </span>
  );
}

export function Segmented({ name, options, value, disabled, label }: { name: string; options: { value: string; label: string; disabled?: boolean }[]; value: string; disabled?: boolean; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value}>
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === value} disabled={disabled || o.disabled} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = "Copy", className = "btn btn-ghost btn-sm" }: { text: string; label?: string; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button ref={ref} type="button" className={className} onClick={async () => {
      try { await navigator.clipboard.writeText(text); if (ref.current) { ref.current.textContent = "Copied"; setTimeout(() => { if (ref.current) ref.current.textContent = label; }, 1500); } } catch { /* clipboard blocked */ }
    }}>{label}</button>
  );
}
