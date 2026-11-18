import type { Metadata } from "next";
import { requireUser } from "@/server/auth/context";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { changePasswordAction } from "../actions";
import { AuthFrame } from "../auth-frame";

export const metadata: Metadata = { title: "Choose a password" };

export default async function ChangePasswordPage() {
  const { user } = await requireUser({ mustChangeOk: true });
  return (
    <AuthFrame kicker={user.mustChangePassword ? "First sign-in" : "Security"}>
      <div className="stack-sm">
        <h1>Choose your password</h1>
        <p className="muted" style={{ margin: 0 }}>{user.mustChangePassword ? "Replace the one-time password Nawat gave you with one only you know." : "Change your password. Other devices will be signed out."}</p>
      </div>
      <ActionForm action={changePasswordAction}>
        <div className="field">
          <label htmlFor="current">{user.mustChangePassword ? "One-time password" : "Current password"}</label>
          <input className="input" id="current" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div className="field">
          <label htmlFor="next">New password</label>
          <input className="input" id="next" name="next" type="password" autoComplete="new-password" minLength={10} required />
          <span className="hint">At least 10 characters, with letters and numbers.</span>
        </div>
        <div className="field">
          <label htmlFor="confirm">Repeat new password</label>
          <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <SubmitButton>Save password</SubmitButton>
      </ActionForm>
    </AuthFrame>
  );
}
