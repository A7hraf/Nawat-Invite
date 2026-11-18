# Nawat Invites · نوات للدعوات

**A luxury platform for 3D digital wedding and engagement invitations, sent as a link.**

Guests open a personal link. A cinematic 3D opening plays (a wax-sealed envelope, palace doors or a velvet curtain). Then the invitation itself appears, with names, date, venue, schedule and RSVP. Confirmed guests get a QR entry pass, and a gatekeeper scans it at the door.

> Status: **Phase 0: Design and architecture** (this commit). Development starts next. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Who uses it

| Role | What they do |
|---|---|
| **System Admin** (Nawat) | Creates client accounts and gives them a username and password. Assigns a tier and package, turns any feature on or off per client, can manage any invitation on a client's behalf, and exports PDF and Excel reports. Has every feature. |
| **Host / Client** (the couple or family) | Logs in to the **Atelier** dashboard, picks a ready theme, customises everything, adds guests, sends links and watches RSVPs arrive. Can do only what their entitlements allow. |
| **Gatekeeper** (venue staff) | Gets a scanner-only login for one event. Scans guest QR passes at the entrance. |
| **Guest** | Opens the link, enjoys the 3D opening, confirms attendance, adds the event to their calendar and gets a QR pass. No account needed. |

## Tiers (theme levels)

These names follow the invitation itself: card, then envelope, then seal. They can be renamed in the admin panel.

| Tier | Arabic | Feel |
|---|---|---|
| **Ivory** | العاجي | Elegant animated card: clean openings and classic themes |
| **Gilded** | المذهّب | Gold-foil themes, 3D envelope and door openings, music |
| **Royal Seal** | الختم الملكي | Cinematic 3D scenes, every theme, every feature |

## Packages

| Package | Who builds the invitation | Client dashboard |
|---|---|---|
| **Atelier** (self-service) | The client builds it in their dashboard | Full editor plus guests and RSVP analytics, limited by entitlements |
| **Concierge** (done-for-you) | The Nawat team builds and manages it | Optional read-only view: live RSVP numbers plus PDF and Excel reports |

## Documentation

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system architecture, stack, modules and request flows
2. [`docs/ENTITLEMENTS.md`](docs/ENTITLEMENTS.md): how the admin controls every feature per client
3. [`docs/GUEST-FLOW.md`](docs/GUEST-FLOW.md): invitation, RSVP builder, calendar, QR pass and check-in
4. [`docs/SECURITY.md`](docs/SECURITY.md): threat model and security controls
5. [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md): visual language, tokens and screen map
6. [`docs/ROADMAP.md`](docs/ROADMAP.md): development phases
7. [`prisma/schema.prisma`](prisma/schema.prisma): database schema (draft)
8. [`design/`](design/): UI/UX design screens

## Fixed invitation footer

Every invitation shows a footer that the platform enforces. Clients cannot remove it.

- Website: https://nawat.om/
- Instagram: https://www.instagram.com/nawattech/
- Phone: +968 923344233 *(check this number: Omani numbers have 8 digits after +968, and this one has 9)*

These values live in `config/brand.ts` (one place to change).
