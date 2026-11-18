# Security design

## 1. Assets and threats

| Asset | Threat | Main controls |
|---|---|---|
| Guest list (names, phones) | Leak across tenants, scraping | Tenant-scoped repository + RLS, unguessable links, rate limits, no PII in URLs or QR |
| Admin account | Credential stuffing, phishing | argon2id, mandatory TOTP 2FA, lockout, IP-aware alerts |
| Client accounts | Weak or reused passwords | Admin-generated strong one-time password, forced change, optional 2FA |
| Entry passes | Forgery, sharing screenshots, replay | 128-bit random keys stored hashed, server-side verification, admit counters, revocation |
| Uploads | Malware, XSS through SVG or HTML, huge files | MIME sniffing, allow-list, re-encode with sharp, no SVG uploads, size quotas, private bucket + CDN |
| Invitation pages | Defacement, XSS through host-entered text | All content rendered as text (no HTML), sanitised rich text (allow-listed marks only), strict CSP |
| RSVP endpoint | Spam, quota exhaustion | Per-IP and per-link rate limits, honeypot, optional Cloudflare Turnstile on open links |
| Reports | Unauthorised download | Private storage, 5-minute signed URLs, entitlement + tenant check, audit |

## 2. Authentication

- **No public sign-up.** Only admins create accounts.
- Passwords are hashed with **argon2id** (m=19 MiB, t=2, p=1). Minimum 10 characters, checked against a top-100k breached list.
- **Sessions**: random 256-bit ID. The DB stores SHA-256(ID). Cookie `__Host-session`, `HttpOnly; Secure; SameSite=Lax; Path=/`. 7-day sliding expiry (12 h for admin). Rotated on login and privilege change.
- **2FA (TOTP)** is mandatory for SUPER_ADMIN and STAFF, and optional for clients. The secret is encrypted at rest (AES-256-GCM, key from env/KMS). There are 10 single-use recovery codes, stored hashed.
- **Lockout**: 5 failed attempts → 15-minute lock + admin notification. Rate limit is 10 attempts per minute per IP.
- **Password reset**: an admin issues a new one-time password (no email reset flow in v1, which removes a whole attack class).
- **Gatekeeper accounts**: scoped to one event, can only call scan and check-in endpoints, and expire automatically the day after the event.

## 3. Authorisation

- **RBAC**: `SUPER_ADMIN > STAFF > CLIENT > GATEKEEPER`.
- **Tenant isolation**: every query goes through `repo(ctx)`, which injects `where: { accountId: ctx.accountId }`. Raw Prisma use outside `/lib/repo` fails lint.
- **Impersonation ("Manage as client")**: admin only. A visible gold banner shows during the session, every action is logged with `actorId` + `actingAsAccountId`, and it ends after 60 minutes.
- **Entitlements** are enforced server-side (see ENTITLEMENTS.md).
- **IDs**: CUID2 for internal IDs. They are never treated as secrets. Capability links use separate random keys.

## 4. Web security

- **CSRF**: Server Actions check Origin. Route handlers that mutate require same-origin plus a double-submit token.
- **CSP** (dashboards): `default-src 'self'; img-src 'self' data: https://cdn…; media-src https://cdn…; script-src 'self' 'nonce-…'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`.
- Invitation pages use the same policy. The studio preview iframe is allowed through `frame-ancestors 'self'` on preview routes only.
- **Headers**: HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera only on `/gate`).
- **Input**: Zod validation on every boundary. Host text is rendered as React text nodes. No `dangerouslySetInnerHTML` (lint rule).
- **Uploads**: presigned PUT with a max size and content type. The worker verifies magic bytes, re-encodes images (strips EXIF/GPS), and transcodes audio. Files are quarantined until verified.

## 5. Data protection

- TLS 1.2+ everywhere. Postgres and backups are encrypted at rest.
- **Field-level encryption** for guest phone numbers and TOTP secrets (AES-256-GCM, rotating key IDs).
- **Retention**: guest PII is deleted or anonymised 90 days after the event, unless the admin extends it. The host can "Delete all guest data" at any time.
- **Backups**: nightly encrypted `pg_dump` to separate storage, kept for 30 days, restore tested monthly.
- Personal data handling is designed with Oman's Personal Data Protection Law (Royal Decree 6/2022) in mind. Have it confirmed by legal counsel before launch.

## 6. Audit and monitoring

- `AuditLog` records logins, failed logins, account creation, entitlement changes, impersonation, publish and unpublish, exports, deletions, and pass revocations.
- Alerts: repeated admin login failures, export spikes, unusual RSVP volume.
- Logs are structured (Pino) with PII redaction.

## 7. Secure SDLC

- Dependabot + `npm audit` in CI. CodeQL scanning on GitHub.
- Secrets live only in environment or secret manager, never in the repo (`.env.example` only).
- Branch protection on `main`: PR review + green CI.
- Pre-launch: OWASP ASVS L2 checklist pass and an external penetration test.
