import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";

/** Sends each role to its home. */
export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.user.role === "SUPER_ADMIN" || s.user.role === "STAFF") redirect("/admin");
  if (s.user.role === "GATEKEEPER") redirect("/gate");
  redirect("/studio");
}
