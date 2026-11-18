import { requireStudio } from "@/server/auth/context";
import { getBrandSettings } from "@/server/settings";
import { NavLinks } from "@/components/ui/nav";
import { IconLogout } from "@/components/ui/icons";
import { logoutAction } from "../(auth)/actions";
import { stopManagingAction } from "../admin/actions";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStudio();
  const brand = await getBrandSettings();
  const initials = ctx.account.displayName.replace(/[^\p{L}\s&]/gu, "").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 3);
  return (
    <div>
      {ctx.actingAs && (
        <div className="acting" role="status">
          <div className="in">
            <span>You are managing <strong>{ctx.account.displayName}</strong> as {ctx.user.displayName}. Every change is recorded.</span>
            <form action={stopManagingAction}><button className="btn btn-sm btn-primary" type="submit">Return to Control Room</button></form>
          </div>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="/studio"><b>NAWAT</b><i>Atelier</i></a>
          <NavLinks className="tabs" label="Studio" items={[{ href: "/studio", label: "My invitations", exact: true }, { href: "/studio/account", label: "Account" }]} />
          <div className="row">
            <span className="badge ink">{brand.tierNames[ctx.plan.tier].en}</span>
            <div className="avatar" style={{ background: "var(--wine)", color: "var(--cream)", fontFamily: "var(--serif)", fontStyle: "italic" }}>{initials || "N"}</div>
            {!ctx.actingAs && <form action={logoutAction}><button className="btn btn-ghost btn-sm" type="submit" aria-label="Sign out"><IconLogout /></button></form>}
          </div>
        </div>
      </header>
      {ctx.readOnly && (
        <div className="container" style={{ paddingBottom: 0 }}>
          <div className="notice">Nawat is preparing and managing your invitation for you. Here you can follow replies and download your reports.</div>
        </div>
      )}
      {children}
    </div>
  );
}
