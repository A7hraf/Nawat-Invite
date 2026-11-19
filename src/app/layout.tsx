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
        <link rel="stylesheet" href="/fonts/cormorant-garamond.css" />
        <link rel="stylesheet" href="/fonts/manrope.css" />
        <link rel="stylesheet" href="/fonts/amiri.css" />
        <link rel="stylesheet" href="/fonts/ibm-plex-sans-arabic.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
