import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters (use: openssl rand -base64 48)"),
  DATABASE_URL: z.string().min(1).default("pglite:./.data/db"),
  UPLOAD_DIR: z.string().default("./.data/uploads"),
  CHROMIUM_PATH: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Validated environment. Fails fast with a readable message when misconfigured. */
export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${msg}\nSee .env.example`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => env().NODE_ENV === "production";
