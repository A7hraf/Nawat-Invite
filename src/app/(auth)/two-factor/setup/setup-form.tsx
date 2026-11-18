"use client";
import { useActionState } from "react";
import { Message, SubmitButton } from "@/components/ui/form";
import { confirmTwoFactorSetupAction } from "../../actions";

export function SetupForm({ token }: { token: string }) {
  const [state, action] = useActionState(confirmTwoFactorSetupAction, null);
  const codes = (state?.data?.codes as string[] | undefined) ?? null;
  if (codes) {
    return (
      <div className="stack">
        <Message state={state} />
        <div className="secret">
          <div className="small">Recovery codes · each works once · store them somewhere safe</div>
          <code style={{ fontSize: 15, lineHeight: 1.8 }}>{codes.join("  ")}</code>
        </div>
        <a className="btn btn-primary" href="/">Continue</a>
      </div>
    );
  }
  return (
    <form action={action} className="stack">
      <Message state={state} />
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="code">6-digit code</label>
        <input className="input mono" id="code" name="code" inputMode="numeric" pattern="[0-9 ]{6,7}" autoComplete="one-time-code" required style={{ fontSize: 22, letterSpacing: ".2em" }} />
      </div>
      <SubmitButton pending="Checking…">Turn on 2-step sign-in</SubmitButton>
    </form>
  );
}
