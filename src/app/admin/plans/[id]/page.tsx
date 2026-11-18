import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSuperAdmin } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { getBrandSettings } from "@/server/settings";
import { EntitlementsSchema } from "@/lib/entitlements";
import { EntitlementFields } from "@/components/entitlement-fields";
import { ActionForm, SubmitButton, Switch } from "@/components/ui/form";
import { savePlanAction } from "../../actions";

export const metadata = { title: "Edit plan" };

export default async function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = await getDb();
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, id) });
  if (!plan) notFound();
  const brand = await getBrandSettings();
  return (
    <>
      <div className="crumbs"><a href="/admin/plans">Plans</a> / {plan.nameEn}</div>
      <h1>{plan.nameEn}</h1>
      <ActionForm action={savePlanAction}>
        <input type="hidden" name="planId" value={plan.id} />
        <div className="card form-grid">
          <div className="field"><label htmlFor="nameEn">Name (English)</label><input className="input" id="nameEn" name="nameEn" defaultValue={plan.nameEn} required /></div>
          <div className="field"><label htmlFor="nameAr">Name (Arabic)</label><input className="input" id="nameAr" name="nameAr" defaultValue={plan.nameAr} dir="rtl" lang="ar" required /></div>
          <div className="field"><label htmlFor="priceOmr">Price (OMR)</label><input className="input" id="priceOmr" name="priceOmr" defaultValue={plan.priceOmr ?? ""} inputMode="decimal" /></div>
          <div className="field"><span className="lbl">Offered to new clients</span><Switch name="active" defaultChecked={plan.active} label="Plan active" /></div>
        </div>
        <EntitlementFields value={EntitlementsSchema.parse(plan.entitlements)} tierNames={brand.tierNames} />
        <div><SubmitButton className="btn btn-gold">Save plan</SubmitButton></div>
      </ActionForm>
    </>
  );
}
