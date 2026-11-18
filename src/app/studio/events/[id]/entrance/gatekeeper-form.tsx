"use client";
import { useActionState } from "react";
import { CopyButton, Message, SubmitButton } from "@/components/ui/form";
import { createGatekeeperAction } from "../../../actions";

export function GatekeeperForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(createGatekeeperAction, null);
  const d = state?.data as { username: string; password: string } | undefined;
  return (
    <form action={action} className="stack">
      <Message state={state} />
      {d && (
        <div className="secret">
          <div className="small">Username</div><code>{d.username}</code>
          <div className="small">Password · shown once</div><code>{d.password}</code>
          <div><CopyButton text={`Sign in at ${location.origin}/login\nUsername: ${d.username}\nPassword: ${d.password}`} label="Copy login" className="btn btn-gold btn-sm" /></div>
        </div>
      )}
      <input type="hidden" name="eventId" value={eventId} />
      <div className="field"><label htmlFor="gkname">Name</label><input className="input" id="gkname" name="name" placeholder="Main door · Khalid" required maxLength={60} /></div>
      <div><SubmitButton>Create gatekeeper login</SubmitButton></div>
    </form>
  );
}
