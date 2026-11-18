"use client";
import { useActionState } from "react";
import { CopyButton, Message, SubmitButton } from "@/components/ui/form";
import { resetPasswordAction } from "../../actions";

export function ResetPassword({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  const pw = state?.data?.password as string | undefined;
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="userId" value={userId} />
      <Message state={state} />
      {pw ? (
        <div className="secret"><div className="small">New one-time password · shown once</div><code>{pw}</code><div><CopyButton text={pw} label="Copy" className="btn btn-sm btn-gold" /></div></div>
      ) : (
        <div><SubmitButton className="btn btn-ghost btn-sm" pending="Issuing…">Issue new one-time password</SubmitButton></div>
      )}
    </form>
  );
}
