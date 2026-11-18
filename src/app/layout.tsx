import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nawat Invites", template: "%s · Nawat Invites" },
  description: "Luxury 3D digital invitations",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#16110F", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers makes every page dynamic, so the per-request CSP nonce applies to Next.js scripts.
  await headers();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Manrope:wght@400;500;600;700&family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
