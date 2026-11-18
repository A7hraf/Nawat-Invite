import { logoutAction } from "../(auth)/actions";
import { getBrandSettings } from "@/server/settings";

export default async function AccountUnavailable() {
  const brand = await getBrandSettings();
  return (
    <main className="container" style={{ maxWidth: 560, minHeight: "80vh", justifyContent: "center" }}>
      <div className="card stack">
        <div className="kicker">Studio</div>
        <h1>Your studio is not available</h1>
        <p className="muted" style={{ margin: 0 }}>Your account is paused, has expired, or Nawat is preparing your invitation for you. Please contact us on <strong dir="ltr">{brand.footer.phone}</strong>.</p>
        <form action={logoutAction}><button className="btn btn-ghost" type="submit">Sign out</button></form>
      </div>
    </main>
  );
}
