import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { logoutAction, verifyTwoFactorAction } from "../actions";
import { AuthFrame } from "../auth-frame";

export const metadata: Metadata = { title: "2-step sign-in" };

export default async function TwoFactorPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.user.totpEnabled) redirect("/two-factor/setup");
  if (s.session.mfaPassed) redirect("/");
  return (
    <AuthFrame kicker="2-step sign-in">
      <div className="stack-sm">
        <h1>Enter your code</h1>
        <p className="muted" style={{ margin: 0 }}>Open your authenticator app and type the 6-digit code for Nawat Invites. You can also use a recovery code.</p>
      </div>
      <ActionForm action={verifyTwoFactorAction}>
        <div className="field">
          <label htmlFor="code">Code</label>
          <input className="input mono" id="code" name="code" inputMode="text" autoComplete="one-time-code" required maxLength={20} style={{ fontSize: 22, letterSpacing: ".2em" }} />
        </div>
        <SubmitButton pending="Checking…">Verify</SubmitButton>
      </ActionForm>
      <form action={logoutAction}><button className="btn btn-ghost btn-sm" type="submit">Use another account</button></form>
    </AuthFrame>
  );
}
