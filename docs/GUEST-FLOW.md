# Guest flow: invitation, RSVP, calendar, QR pass, check-in

## 1. Links

| Link type | URL | Use |
|---|---|---|
| **Personal** | `/i/{eventSlug}/{guestKey}` | One per guest. Greets them by name ("Dear Ahmed & family"), enforces their companion limit, and tracks opened and replied status. Counts against `maxGuestPasses`. |
| **Open** (if entitled) | `/i/{eventSlug}` | One shareable link for group chats. Each RSVP counts against the quota. |

- `eventSlug`: readable plus random, e.g. `sara-omar-7Kq2` (no full names, no dates).
- `guestKey`: 22-character random base62 (~131 bits). Stored as HMAC-SHA256 for lookup plus AES-GCM ciphertext so the host can re-copy links.

**Sending.** The host sends links from the Guests page:
- **WhatsApp** click-to-chat per guest (`wa.me/<phone>?text=<message + link>`), one tap each, at no API cost
- **Copy link** / **Copy all as CSV**
- Phase 2: bulk send through the WhatsApp Business Cloud API (needs Meta approval)

## 2. Invitation page sections (order is editable, each can be turned on or off)

1. **Opening**: 3D scene (envelope + wax seal / palace doors / velvet curtain / jewel box / mother-of-pearl shell). "Tap to open". Music starts.
2. **Bismillah / verse** (optional; Arabic calligraphy)
3. **Hosts and names**: families' names (common in Omani invitations), couple names
4. **Invitation message**
5. **Date reveal**: scratch-to-reveal or wax-seal break, then a live **countdown**
6. **Schedule**: e.g. Arrival 8:00 PM · Zaffa 9:00 PM · Dinner 10:00 PM
7. **Venue**: name, address, map button (Google Maps / Apple Maps deep link)
8. **Notices**: e.g. 🚫 children · 📵 photography · dress code palette (each with custom text)
9. **Gallery** (if entitled)
10. **RSVP**
11. **Footer (locked)**: Nawat website · Instagram · phone

## 3. RSVP form builder (host side)

Every field has three states: **Off · Optional · Required**.

| Field | States | Notes |
|---|---|---|
| Attendance | always on | "Joyfully attending" / "Regretfully declining" (custom wording) |
| Name | Off / Optional / Required | Pre-filled for personal links |
| Phone | Off / Optional / Required | E.164, Oman `+968` default, validated |
| Companions | Off / Optional / Required | Stepper 0…N. **N = guest's allowance** (personal link) or a global max (open link). Host can set "Only the invitee" (N = 0). |
| Note to hosts | Off / Optional / Required | Max 300 characters |
| Custom questions | up to entitlement | Short text or single choice |
| RSVP deadline | date | After it, the form shows "RSVPs closed" |
| Allow changing answer | yes/no | Through the same personal link until the deadline |

**Simplest mode:** every field Off means the guest sees only **"I will attend"** → done → pass.

**Notices** (separate from the form): children not allowed, no photography, dress code, "women only hall", custom notice. Each one can be:
- *Display only*, or
- *Must acknowledge*: a checkbox the guest has to tick before submitting.

## 4. After RSVP (attending)

1. Server transaction: validate → check the companion limit → check the quota → create `Rsvp` → create `Pass` (`admitCount = 1 + companions`).
2. The guest sees a **pass card** in the theme's style:
   - QR code (encodes `https://{host}/p/{passKey}`; the passKey is a 128-bit random value, and the DB stores only its SHA-256)
   - Name, number of people admitted, event date
   - **Add to calendar**: Google link, Outlook link, and `.ics` download (Apple). Includes a 1-day reminder (`VALARM`).
   - "Save pass": saves a PNG, and keeps the pass reachable at the personal link
3. Declined: a warm thank-you screen. No pass is issued.

## 5. Check-in at the entrance

```mermaid
sequenceDiagram
  participant Gk as Gatekeeper (Scanner PWA)
  participant S as Server
  Gk->>S: POST /api/pass/verify {passKey, eventId} (session)
  S->>S: hash(passKey) → Pass; check event match, not revoked
  alt valid & not fully admitted
    S-->>Gk: ✅ Name · party of 4 · 0 admitted so far
    Gk->>S: POST /api/checkin {passId, admitted: 4}
    S-->>Gk: Recorded 20:14
  else already admitted
    S-->>Gk: ⚠️ Already checked in at 19:52 (party of 4)
  else invalid / other event / revoked
    S-->>Gk: ⛔ Not valid for this event
  end
```

- **Partial admits**: a party of 5 can arrive as 3 and then 2. The pass tracks `admittedTotal`.
- **Manual lookup**: search by name or phone, for guests without their phone.
- **Offline tolerance**: the scanner caches a signed list of pass hashes for its event (refreshed every 30 s) and queues check-ins if the network drops, then syncs. Conflicts resolve to "first scan wins" and are flagged.
- **Live board** for host and admin: arrived vs expected, by side, in real time (SSE).

## 6. Privacy defaults

- An invitation becomes **private 30 days after the event** (configurable). Links then show "This celebration has ended".
- Guests' IPs are stored only as a salted hash (abuse prevention). No tracking cookies on invitation pages.
- The RSVP form shows a short consent line: "Your details are shared only with the hosts."
