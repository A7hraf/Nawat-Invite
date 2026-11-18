"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon?: ReactNode; exact?: boolean };

export function NavLinks({ items, className = "nav", label }: { items: NavItem[]; className?: string; label: string }) {
  const path = usePathname();
  return (
    <nav className={className} aria-label={label}>
      {items.map((i) => {
        const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
            {i.icon}{i.label}
          </Link>
        );
      })}
    </nav>
  );
}
