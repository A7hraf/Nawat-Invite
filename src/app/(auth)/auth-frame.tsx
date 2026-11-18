import type { ReactNode } from "react";

/** Split-screen frame shared by every sign-in step. */
export function AuthFrame({ children, kicker }: { children: ReactNode; kicker: string }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <div className="brand"><b>NAWAT</b><i>Invites</i></div>
        <div className="seal" aria-hidden="true"><span>N</span></div>
        <div className="stack-sm">
          <h2>Every celebration begins <em>under seal.</em></h2>
          <div className="ar" style={{ fontSize: 22, color: "#C9BBA9" }} lang="ar" dir="rtl">كل فرحة تبدأ بدعوة مختومة</div>
        </div>
      </div>
      <div className="auth-form">
        <div>
          <div className="kicker">{kicker}</div>
          {children}
        </div>
      </div>
    </div>
  );
}
