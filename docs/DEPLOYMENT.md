# Deployment

## Render (one click)

1. In Render: **New → Blueprint**, connect GitHub and pick `A7hraf/Nawat-Invite`. `render.yaml` creates the web service (Docker, 5 GB disk for uploads, Frankfurt) and a PostgreSQL 16 database. It also generates `APP_SECRET`.
2. Optionally set `SEED_ADMIN_PASSWORD`. Otherwise open the first deploy's logs and copy the one-time admin password.
3. Open `https://<service>.onrender.com/login`, sign in as `admin`, set up 2-step sign-in and choose a new password.
4. Custom domain: Settings → Custom Domains → `invites.nawat.om`, then add the CNAME record at your DNS provider. Set `APP_URL=https://invites.nawat.om` so links and QR codes use it.

## Railway

New Project → Deploy from GitHub repo, then add a PostgreSQL database. On the app service:

- Set `DATABASE_URL=${{Postgres.DATABASE_URL}}` and `APP_SECRET` (`openssl rand -base64 48`).
- Add a volume mounted at `/data`.
- Generate a public domain.

`railway.json` already selects the Dockerfile.


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
