# Meta Ads Autopilot Dashboard (MVP)

Production-ready internal dashboard built with **Next.js App Router + TypeScript + Prisma + PostgreSQL + NextAuth**.

## Features
- Authentication (Credentials + optional Google OAuth)
- RBAC (`ADMIN`, `MARKETER`, `VIEWER`)
- Meta connection placeholder (encrypted token at rest)
- KPI dashboard (Spend, Conversions, CPA, ROAS, CTR, Frequency)
- Rule engine (3 core templates)
- Hourly worker with idempotent action keys
- Audit logs + notification delivery (Email + LINE Notify)
- Health endpoint: `/api/health`
- Dockerized web + postgres + worker

## Local setup
1. Copy env
   ```bash
   cp .env.example .env
   ```
2. Install + database
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```
3. Login with seeded user: `admin@company.local / Admin@12345`

## Docker / VPS deploy
```bash
docker compose up --build -d
```
This starts:
- `web` app on port `3000`
- `db` postgres
- `worker` loop executes hourly rule evaluation

### Ubuntu VPS hourly worker via cron (alternative)
If you prefer host cron instead of `worker` service:
```bash
crontab -e
# every hour
0 * * * * cd /opt/meta-ads-autopilot && docker compose exec -T web npm run worker >> /var/log/meta-autopilot-worker.log 2>&1
```

## Security & operations notes
- Set strong `NEXTAUTH_SECRET` and `FIELD_ENCRYPTION_KEY`.
- Access tokens are encrypted server-side in `MetaConnection.accessTokenEnc`.
- Add reverse proxy (Nginx/Caddy) with HTTPS termination.
- Keep `.env` out of VCS; rotate SMTP/LINE credentials periodically.
- Health checks at `/api/health` for uptime monitors.

## How to integrate real Meta Graph API later
- Replace stub endpoint `src/app/api/meta/test/route.ts`.
- Add OAuth callback route and token refresh logic in `src/lib/meta-client.ts` (to be added).
- Build metrics ingestion service writing to `Metric` table hourly/daily.

## Limitations / next steps
- Rule Builder UI editing is currently API-first + list UI; add full form + toasts.
- Add distributed lock (e.g., PG advisory lock) for multi-worker concurrency.
- Add Sentry/OpenTelemetry traces and dashboards.
- Add per-tenant/team support if needed.

## Production reverse proxy hints
- Proxy `443 -> web:3000`
- Enforce HSTS, TLS1.2+, and secure cookies.
- Restrict dashboard access by VPN/IP allowlist for internal use.
