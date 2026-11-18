import { asc, eq } from "drizzle-orm";
import { requireStaff } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { NewClientForm } from "./new-client-form";

export const metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireStaff();
  const db = await getDb();
  const plans = await db.select().from(schema.plans).where(eq(schema.plans.active, true)).orderBy(asc(schema.plans.package), asc(schema.plans.tier));
  return (
    <>
      <div className="stack-sm">
        <div className="crumbs"><a href="/admin/clients">Clients</a> / New</div>
        <h1>New client account</h1>
        <p className="muted" style={{ margin: 0 }}>Create the account after payment. You’ll get a one-time password to share with the client; they choose their own at first sign-in.</p>
      </div>
      <NewClientForm plans={plans.map((p) => ({ id: p.id, name: p.nameEn, price: p.priceOmr, pkg: p.package }))} />
    </>
  );
}
