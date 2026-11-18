import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { EntitlementError } from "@/lib/entitlements";
import { UserError, type ActionState } from "@/lib/errors";
import { HttpError } from "./request";

/** Turns known errors into friendly messages; unknown errors are logged and hidden. */
export function toActionError(e: unknown): ActionState {
  unstable_rethrow(e); // let redirect()/notFound() through
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return { error: first ? `${first.path.join(".") || "Input"}: ${first.message}` : "Please check the form" };
  }
  if (e instanceof UserError || e instanceof EntitlementError || e instanceof HttpError) return { error: e.message };
  console.error(e);
  return { error: "Something went wrong. Please try again." };
}

export async function run(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: "Saved" };
  } catch (e) {
    return toActionError(e);
  }
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export const num = (fd: FormData, k: string, d = 0) => {
  const n = Number(str(fd, k));
  return Number.isFinite(n) ? n : d;
};
