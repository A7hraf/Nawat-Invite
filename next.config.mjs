/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Native / wasm packages stay on the Node side and are not bundled.
  serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2", "sharp", "playwright-core", "exceljs", "pg"],
  experimental: { serverActions: { bodySizeLimit: "45mb" } },
};

export default nextConfig;
