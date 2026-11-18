"use client";
import { useActionState } from "react";
import { CopyButton, Message, SubmitButton } from "@/components/ui/form";
import { createClientAction } from "../../actions";

type PlanOpt = { id: string; name: string; price: string | null; pkg: string };

export function NewClientForm({ plans }: { plans: PlanOpt[] }) {
  const [state, action] = useActionState(createClientAction, null);
  const done = state?.data as { password: string; username: string; accountId: string } | undefined;
  if (done) {
    const share = `Your Nawat Invites studio is ready.\nSign in: ${location.origin}/login\nUsername: ${done.username}\nOne-time password: ${done.password}\nYou will choose your own password at first sign-in.`;
    return (
      <div className="card stack" style={{ maxWidth: 620 }}>
        <Message state={state} />
        <div className="secret">
          <div className="small">Username</div><code>{done.username}</code>
          <div className="small" style={{ marginTop: 6 }}>One-time password · shown only once</div><code>{done.password}</code>
        </div>
        <div className="row">
          <CopyButton text={share} label="Copy message for the client" className="btn btn-gold" />
          <a className="btn btn-primary" href={`/admin/clients/${done.accountId}`}>Open client</a>
        </div>
      </div>
    );
  }
  return (
    <form action={action} className="card stack" style={{ maxWidth: 820 }}>
      <Message state={state} />
      <div className="form-grid">
        <div className="field"><label htmlFor="displayName">Celebration / client name</label><input className="input" id="displayName" name="displayName" placeholder="Sara & Omar" required maxLength={80} /></div>
        <div className="field"><label htmlFor="username">Username</label><input className="input mono" id="username" name="username" placeholder="sara.omar" required pattern="[a-zA-Z0-9._\-]{3,40}" autoCapitalize="none" /><span className="hint">Letters, numbers, dot, dash or underscore.</span></div>
        <div className="field"><label htmlFor="contactName">Contact person</label><input className="input" id="contactName" name="contactName" maxLength={80} /></div>
        <div className="field"><label htmlFor="contactPhone">Contact phone</label><input className="input" id="contactPhone" name="contactPhone" inputMode="tel" maxLength={20} placeholder="+968 9XXXXXXX" /></div>
        <div className="field">
          <label htmlFor="planId">Package & tier</label>
          <select className="input" id="planId" name="planId" required>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.price ? ` · ${p.price} OMR` : ""}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="validUntil">Valid until</label><input className="input" id="validUntil" name="validUntil" type="date" /><span className="hint">Leave empty for no expiry.</span></div>
      </div>
      <div className="field"><label htmlFor="notes">Internal notes</label><textarea className="input" id="notes" name="notes" maxLength={2000} placeholder="Payment reference, special requests…" /></div>
      <div><SubmitButton pending="Creating…">Create account</SubmitButton></div>
    </form>
  );
}
