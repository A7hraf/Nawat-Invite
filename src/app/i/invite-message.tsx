/** Elegant full-page message for links that cannot be shown (personal-only, ended, not found). */
export function InviteMessage({ title, titleAr, body, bodyAr }: { title: string; titleAr: string; body: string; bodyAr: string }) {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "radial-gradient(120% 75% at 50% 30%, #521827, #16110F 70%)", color: "#F7F2EA", textAlign: "center" }}>
      <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
        <div className="seal" aria-hidden="true"><span>N</span></div>
        <h1 style={{ color: "#F7F2EA" }}>{title}</h1>
        <p style={{ margin: 0, color: "#C9BBA9" }}>{body}</p>
        <div lang="ar" dir="rtl" className="ar" style={{ fontSize: 24, color: "#E9D9B8", marginTop: 10 }}>{titleAr}</div>
        <p lang="ar" dir="rtl" style={{ margin: 0, color: "#C9BBA9", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{bodyAr}</p>
      </div>
    </main>
  );
}

export const ENDED = { title: "This celebration has ended", titleAr: "انتهت هذه المناسبة", body: "Thank you for being part of it.", bodyAr: "شكراً لكونكم جزءاً منها." };
export const NOT_FOUND = { title: "Invitation not found", titleAr: "الدعوة غير موجودة", body: "Please check the link you received.", bodyAr: "يرجى التأكد من الرابط الذي وصلك." };
export const PERSONAL = { title: "This invitation is personal", titleAr: "هذه الدعوة شخصية", body: "Please open the personal link the hosts sent you.", bodyAr: "يرجى فتح الرابط الخاص الذي وصلك من أصحاب الدعوة." };
