# Entitlements: how the admin controls every feature

> Source of truth: [`src/lib/entitlements.ts`](../src/lib/entitlements.ts) (schema, defaults, merge rules). The admin edits every value in Control Room → Plans and per client.

Every client feature is a typed **entitlement**. A client's effective entitlements are:

```
effective = deepMerge(plan.entitlements, account.entitlementOverrides)
```

- **Plans** are presets (tier × package) the admin defines once, for example "Gilded · Atelier".
- **Overrides** are per-client switches the admin flips in the client's page. Each switch shows whether it is *inherited from plan* or *overridden*, with a "reset to plan" action.
- The server checks entitlements on **every mutation and every publish**, not only in the UI.
- The **System Admin always has everything**. Admin sessions skip entitlement checks but still respect validation.

## Entitlement schema (v1)

```ts
// lib/entitlements/schema.ts  (Zod; versioned)
export const Entitlements = z.object({
  version: z.literal(1),

  themes: z.object({
    tiers: z.array(z.enum(["IVORY", "GILDED", "ROYAL_SEAL"])),  // tiers the client can use
    extraThemeIds: z.array(z.string()).default([]),            // single themes unlocked one by one
  }),

  invitations: z.object({
    maxEvents: z.number().int().min(1),        // e.g. engagement + wedding = 2
    maxGuestPasses: z.number().int().min(0),   // how many people they can send a link to
    openLinkAllowed: z.boolean(),              // one public link (RSVPs count against the quota)
    languages: z.array(z.enum(["ar", "en"])),
  }),

  music: z.object({
    enabled: z.boolean(),
    maxTracksOnInvite: z.number().int().min(0), // tracks playing on the invitation
    trialLimit: z.number().int().min(0),        // how many library tracks they can try on the invite
    allowUpload: z.boolean(),                   // upload their own audio
  }),

  rsvp: z.object({
    enabled: z.boolean(),
    fields: z.object({                          // fields the host may switch on
      name: z.boolean(),
      phone: z.boolean(),
      companions: z.boolean(),
      note: z.boolean(),
      customQuestions: z.number().int().min(0), // e.g. 0, 2, 5
    }),
    notices: z.boolean(),                       // "no children", "no photography", dress code…
    addToCalendar: z.boolean(),
  }),

  checkin: z.object({
    qrPass: z.boolean(),
    gatekeepers: z.number().int().min(0),       // scanner accounts
  }),

  media: z.object({
    photos: z.number().int().min(0),            // gallery photo count
    openingVideo: z.boolean(),                  // custom cinematic opening video
    storageMb: z.number().int(),
  }),

  reports: z.object({
    dashboardAnalytics: z.boolean(),
    exportPdf: z.boolean(),
    exportExcel: z.boolean(),
  }),

  studio: z.object({
    access: z.enum(["FULL", "READ_ONLY", "NONE"]), // Atelier = FULL, Concierge = READ_ONLY or NONE
  }),
});
```

## Default plan matrix (editable in Admin → Plans)

| Entitlement | Ivory | Gilded | Royal Seal |
|---|---|---|---|
| Theme tiers | Ivory | Ivory + Gilded | All |
| Events | 1 | 2 | 3 |
| Guest passes | 150 | 400 | 1,000 |
| Open public link | — | ✓ | ✓ |
| Languages | 1 | AR + EN | AR + EN |
| Music | — | 1 track, 5 trials | 3 tracks, unlimited trials, upload |
| RSVP | Attend button only | Name, phone, companions | All fields + 5 custom questions |
| Notices (no kids, no photos, dress code) | — | ✓ | ✓ |
| Add to calendar | ✓ | ✓ | ✓ |
| QR pass + check-in | — | ✓ (1 gatekeeper) | ✓ (5 gatekeepers) |
| Gallery photos | 0 | 6 | 20 |
| Custom opening video | — | — | ✓ |
| PDF / Excel reports | — | PDF | PDF + Excel |

**Package modifier:**
- **Atelier** → `studio.access = FULL`
- **Concierge** → `studio.access = READ_ONLY` (live numbers and downloads only) or `NONE`. Admin builds the invitation through *Manage as client*.

## Enforcement points

| Where | Check |
|---|---|
| Theme picker | Themes outside `themes.tiers` show as locked previews with "Ask Nawat to upgrade" |
| Editor save | Server action validates that `EventConfig` only uses entitled sections and options |
| Guest import/add | `count(guests) + new ≤ maxGuestPasses`, inside a DB transaction (no race) |
| Open-link RSVP | Rejected once `attending + pending ≥ maxGuestPasses` |
| Music trial | Each *new* track applied to the invite is recorded in `MusicTrial`. Blocked after `trialLimit` |
| Publish | Full re-validation; publishing is blocked with a clear list of what's over the limit |
| Downgrade | Existing published content keeps working until the next edit, and the client sees a banner |
| Reports API | `exportPdf` / `exportExcel` checked before enqueueing |

All denials return a typed `EntitlementError { key, limit, current }`. The UI turns it into a friendly message such as *"Your plan includes 150 guest passes. You've used 150. Contact Nawat to add more."*
