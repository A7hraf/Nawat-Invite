# Deployment

## One server with Docker (recommended start)

Requirements: a Linux VPS with Docker, and a domain (e.g. `invites.nawat.om`) whose DNS A record points at the server. A GCC region (AWS UAE `me-central-1` or Bahrain `me-south-1`) keeps latency low for Omani guests.

```bash
git clone <repo> nawat-invites && cd nawat-invites
cp .env.example .env
# edit .env:
#   APP_URL=https://invites.nawat.om
#   APP_SECRET=$(openssl rand -base64 48)     ← keep it safe; never change it after launch
#   DOMAIN=invites.nawat.om
#   POSTGRES_PASSWORD=$(openssl rand -base64 24)
docker compose up -d --build
docker compose logs app | grep -A3 "First admin"   # one-time admin password
```

The stack runs three services:

- **caddy**: HTTPS certificates are issued automatically, and it forwards requests to the app.
- **app**: Next.js. Migrations and the idempotent seed run on every start. Chromium is built in for PDF reports.
- **db**: PostgreSQL 16. Data is kept in the `pgdata` volume, and uploads in the `uploads` volume.

## Backups

```bash
# nightly (cron): database + uploads
docker compose exec -T db pg_dump -U nawat nawat | gzip > /backups/nawat-$(date +%F).sql.gz
docker run --rm -v nawat-invites_uploads:/u -v /backups:/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```

Keep copies off the server, and test a restore every month.

## Updating

```bash
git pull && docker compose up -d --build     # migrations apply automatically
```

## Checklist before going live

- [ ] `APP_SECRET` generated and stored safely (losing it makes phone numbers and 2FA secrets unreadable)
- [ ] Admin signed in, 2FA enrolled and recovery codes stored
- [ ] Footer phone number confirmed (Control Room → Settings)
- [ ] Music library contains only licensed tracks
- [ ] Backups scheduled and one restore tested
- [ ] Legal review of guest-data handling (Oman PDPL, Royal Decree 6/2022)
