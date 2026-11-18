# Roadmap

## v0.1: done ✅

- Admin Control Room: clients, one-time passwords, plans, **per-client feature overrides**, manage-as-client (audited), themes, music library, team, audit log, settings
- Security: argon2id, mandatory TOTP 2FA for staff (with recovery codes and replay protection), lockout, Postgres rate limits, CSP with nonces, encrypted phone numbers and keys, tenant-scoped data access, same-origin checks
- Client studio: invitations, bilingual content, reply-form builder (Off / Optional / Required, must-tick notices, custom questions, deadline, open link), music with try limits and uploads, photo gallery, guests (add, CSV import, WhatsApp, copy link), gatekeepers, live arrivals, PDF and Excel reports, view-only Concierge mode
- Guest invitation: 10 themes, 4 real-time 3D openings, AR/EN RTL, countdown, calendar (Google / Outlook / .ics), map, notices, gallery, music, RSVP, QR pass, locked footer
- Entrance scanner: camera QR, party admits, double-entry protection, name search
- Tests: unit + integration (in-memory Postgres), 39-step browser test, CI, Docker

## Next

| Priority | Item |
|---|---|
| High | Arabic (RTL) version of the Control Room and Atelier dashboards |
| High | Bulk WhatsApp sending through the WhatsApp Business Cloud API (needs Meta approval) |
| High | Automatic deletion or anonymisation of guest data 90 days after the event |
| Medium | Guest reminders for people who opened but did not reply |
| Medium | Offline mode for the gate scanner (cached pass list + sync) |
| Medium | Apple / Google Wallet passes |
| Medium | Postgres row-level security as a second tenancy wall |
| Medium | More themes and opening styles (shell, scroll, lantern…) |
| Later | Marketing website, online payments, custom domains per invitation |
