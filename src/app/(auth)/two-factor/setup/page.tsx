import type { Metadata } from "next";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/server/auth/session";
import { newTotpSecret, sealSetupToken, totpUri } from "@/server/auth/totp";
import { AuthFrame } from "../../auth-frame";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up 2-step sign-in" };

export default async function SetupPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.user.totpEnabled) redirect(s.session.mfaPassed ? "/" : "/two-factor");
  const secret = newTotpSecret();
  const uri = totpUri(secret, s.user.username);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#16110F", light: "#FFFDF9" } });
  const token = sealSetupToken(s.user.id, secret);
  return (
    <AuthFrame kicker="Protect your account">
      <div className="stack-sm">
        <h1>Set up 2-step sign-in</h1>
        <p className="muted" style={{ margin: 0 }}>Admin accounts need a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).</p>
      </div>
      <ol className="stack-sm small" style={{ paddingInlineStart: 18, margin: 0 }}>
        <li>Scan this code with the app.</li>
        <li>Type the 6-digit code it shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={220} height={220} alt="QR code to add Nawat Invites to your authenticator app" style={{ borderRadius: 16, border: "1px solid var(--line)", alignSelf: "center" }} />
      <details className="more"><summary>Can’t scan? Enter this key</summary><code className="mono" style={{ wordBreak: "break-all" }}>{secret}</code></details>
      <SetupForm token={token} />
    </AuthFrame>
  );
}
