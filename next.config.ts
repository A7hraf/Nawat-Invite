import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Native / wasm packages stay on the Node side and are not bundled.
  serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2", "sharp", "playwright-core", "exceljs", "pg"],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
