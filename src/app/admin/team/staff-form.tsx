"use client";
import { useActionState } from "react";
import { Message, SubmitButton } from "@/components/ui/form";
import { createStaffAction } from "../actions";

export function StaffForm() {
  const [state, action] = useActionState(createStaffAction, null);
  const d = state?.data as { password: string; username: string } | undefined;
  return (
    <form action={action} className="stack">
      <Message state={state} />
      {d && <div className="secret"><div className="small">{d.username} · one-time password</div><code>{d.password}</code></div>}
      <div className="field"><label htmlFor="displayName">Full name</label><input className="input" id="displayName" name="displayName" required /></div>
      <div className="field"><label htmlFor="username">Username</label><input className="input mono" id="username" name="username" required autoCapitalize="none" /></div>
      <div><SubmitButton>Create staff account</SubmitButton></div>
    </form>
  );
}
