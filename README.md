# Nawat Invites · نوات للدعوات

**A luxury platform for 3D digital wedding and engagement invitations, sent as a personal link.**

Guests open their link. A real-time 3D opening plays (a wax-sealed envelope, carved palace doors, a velvet curtain or a jewel box), then the invitation itself, then a reply form. Attending guests get a QR entry pass, and gatekeepers scan it at the door. Hosts follow everything live and download PDF and Excel reports.

**Status:** v0.1, a fully working system (admin, client studio, guest invitations, 10 themes, RSVP, QR entry, reports). See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Quick start (local, no database server needed)

```bash
npm install
cp .env.example .env                 # then set APP_SECRET:  openssl rand -base64 48
npm run setup                        # creates the local database + plans, themes, music, first admin
npm run dev                          # http://localhost:3000
```

The first admin's username and one-time password are printed by `npm run setup`. At first sign-in you set up 2-step verification (any authenticator app) and choose a new password. Set `SEED_DEMO=1` before `npm run setup` to also create two demo clients with a published invitation.

Locally the app uses **PGlite**, an embedded PostgreSQL, so nothing needs to be installed. Only one process may open it at a time. Production uses a real PostgreSQL server (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).

## What's inside

| Area | Who | Highlights |
|---|---|---|
| **Control Room** `/admin` | System Admin, staff | Create client accounts with one-time passwords. Plans by tier × package. Turn **any feature or limit on or off per client** (overrides). Manage any invitation as the client (audited). Theme tiers and visibility, music library, team, audit log, footer and tier-name settings. |
| **Atelier** `/studio` | Clients (hosts) | Invitations: theme, bilingual details, schedule, venue. Reply form builder (each field Off / Optional / Required, notices that must be ticked, custom questions, deadline, open link). Music with try limits, photos, guest list with WhatsApp sending and CSV import, gatekeeper logins, live arrivals, PDF/Excel reports. Concierge clients get a view-only studio. |
| **Invitation** `/i/<event>/<guest-key>` | Guests | 3D opening, Arabic/English (RTL), countdown, calendar (Google, Outlook, Apple .ics), map, notices, gallery, music, RSVP, QR pass, locked Nawat footer. |
| **Entrance** `/gate/<event>` | Gatekeepers, hosts | Camera QR scanning, party-size admits, blocks double entry, name search, live counter. |

## Tiers and packages

| Tier | Arabic | Opens with |
|---|---|---|
| **Ivory** | العاجي | Animated envelope themes |
| **Gilded** | المذهّب | Palace doors, pearl jewel box, velvet curtain, music, QR entry |
| **Royal Seal** | الختم الملكي | Signature cinematic themes, every feature |

**Atelier** means the client builds the invitation themselves. **Concierge** means Nawat builds it, and the client sees live numbers and reports. Every value can be changed per plan and per client.

## Tech

Next.js 16 · React 19 · TypeScript (strict) · PostgreSQL + Drizzle ORM · Three.js · Zod · argon2id · TOTP 2FA · sharp · ExcelJS · headless Chromium for Arabic-correct PDFs.

```bash
npm run typecheck     # TypeScript
npm test              # unit + integration tests (in-memory Postgres)
node tests/e2e/smoke.mjs   # 39-step browser test against a running server
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Entitlements](docs/ENTITLEMENTS.md)
- [Guest flow](docs/GUEST-FLOW.md)
- [Security](docs/SECURITY.md)
- [Themes](docs/THEMES.md)
- [Design system](docs/DESIGN-SYSTEM.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

## Invitation footer (enforced on every invitation)

[nawat.om](https://nawat.om/) · [@nawattech](https://www.instagram.com/nawattech/) · +968 923344233. Editable in Control Room → Settings. *Check the phone number: Omani numbers have 8 digits after +968, and this one has 9.*
