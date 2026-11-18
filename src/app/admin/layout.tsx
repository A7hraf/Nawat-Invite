import { requireStaff } from "@/server/auth/context";
import { NavLinks } from "@/components/ui/nav";
import { IconCog, IconFile, IconGrid, IconLogout, IconMusic, IconPalette, IconShield, IconStar, IconUsers } from "@/components/ui/icons";
import { logoutAction } from "../(auth)/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStaff();
  const initials = user.displayName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="shell">
      <aside className="side">
        <a className="brand" href="/admin"><b>NAWAT</b><i>Invites</i></a>
        <div className="label">Control Room</div>
        <NavLinks label="Admin" items={[
          { href: "/admin", label: "Overview", icon: <IconGrid />, exact: true },
          { href: "/admin/clients", label: "Clients", icon: <IconUsers /> },
          { href: "/admin/plans", label: "Plans & tiers", icon: <IconStar /> },
          { href: "/admin/themes", label: "Themes", icon: <IconPalette /> },
          { href: "/admin/music", label: "Music library", icon: <IconMusic /> },
          { href: "/admin/audit", label: "Audit log", icon: <IconFile /> },
          ...(user.role === "SUPER_ADMIN" ? [{ href: "/admin/team", label: "Team", icon: <IconShield /> }, { href: "/admin/settings", label: "Settings", icon: <IconCog /> }] : []),
        ]} />
        <div className="me">
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: "var(--ivory)", fontWeight: 600 }}>{user.displayName}</div>
            <div className="tiny" style={{ color: "var(--muted-d)" }}>{user.role === "SUPER_ADMIN" ? "System Admin" : "Staff"} · 2FA on</div>
          </div>
          <form action={logoutAction}><button className="btn btn-sm" type="submit" aria-label="Sign out" style={{ background: "transparent", color: "var(--cream)", border: "1px solid var(--ink-line)" }}><IconLogout /></button></form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
