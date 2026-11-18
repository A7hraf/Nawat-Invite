# Development roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 · Design** ✅ | Architecture, data model, security, entitlements, UI/UX screens | You approve the design |
| **1 · Foundation** | Next.js monorepo, design-system components (AR/EN + RTL), Prisma + migrations, auth (argon2, sessions, TOTP), RBAC, tenant repo layer, audit log, Docker Compose, CI | Admin can log in with 2FA; CI is green |
| **2 · Control Room** | Admin: clients (create, issue credentials), plans, entitlement overrides, themes catalogue, music library, settings (footer, tier names) | Admin creates a client who can log in |
| **3 · Atelier editor** | Theme picker, live editor (sections, texts, colours, fonts, photos, music trials), versioning, publish checks | Client publishes an invitation |
| **4 · Guest experience** | Public invitation renderer, 3 launch themes (one per tier) with 3D openings and fallbacks, countdown, map, calendar (.ics / Google / Outlook), locked Nawat footer | Lighthouse mobile ≥ 90 and an opening that looks great on a mid-range Android |
| **5 · RSVP & passes** | RSVP builder (Off / Optional / Required), notices, personal and open links, WhatsApp sharing, QR passes | End-to-end RSVP → pass |
| **6 · Check-in** | Gatekeeper accounts, scanner PWA (camera, manual lookup, offline queue), live arrival board | 200 scans in 10 minutes with no double entry |
| **7 · Reports** | Analytics dashboard, PDF (Arabic-correct) and Excel exports, Concierge read-only view | Report matches DB numbers exactly |
| **8 · Hardening & launch** | Rate limits, CSP, backups, monitoring, ASVS L2 checklist, pen test, production deploy | Go-live |
| Later | WhatsApp Business API bulk send, Apple/Google Wallet passes, more themes, marketing site, online payments | |
