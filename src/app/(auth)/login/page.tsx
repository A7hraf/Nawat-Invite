import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { getBrandSettings } from "@/server/settings";
import { loginAction } from "../actions";
import { AuthFrame } from "../auth-frame";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  const brand = await getBrandSettings();
  return (
    <AuthFrame kicker="Private studio">
      <div className="stack-sm">
        <h1>Welcome back</h1>
        <p className="muted" style={{ margin: 0 }}>Sign in with the credentials Nawat issued for your celebration.</p>
      </div>
      <ActionForm action={loginAction}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input className="input" id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={60} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} />
        </div>
        <SubmitButton className="btn btn-primary" pending="Checking…">Enter the studio</SubmitButton>
      </ActionForm>
      <div className="notice small">
        Accounts are created by Nawat only. Forgot your password? Message us on <strong dir="ltr">{brand.footer.phone}</strong>.
      </div>
    </AuthFrame>
  );
}
