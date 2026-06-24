# RetroSnap MVP Deployment Guide

## VPS Requirements

- 2 vCPU / 2 GB RAM minimum for a small beta event.
- Docker and Docker Compose plugin.
- Persistent disk for PostgreSQL.
- Access to Cloudflare R2 or S3-compatible object storage.

## DNS Records

For a beta deployment, point subdomains at the VPS:

- `api.example.com`
- `camera.example.com`
- `admin.example.com`

## Required Environment Variables

Start from `.env.example` and replace all secrets:

- `DATABASE_URL`
- `ADMIN_TOKEN`
- `GUEST_TOKEN_SECRET`
- `PUBLIC_GUEST_APP_URL`
- `PUBLIC_DASHBOARD_URL`
- `PUBLIC_API_URL`
- `CORS_ALLOWED_ORIGINS`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## Docker Compose Startup

Development-style local stack:

```bash
cp .env.example .env
docker compose up --build
```

For production, prefer built static frontend assets served behind Caddy rather than Vite dev servers.

## Migration Command

Docker Compose includes a `migrate` service. To run manually:

```bash
for file in services/api/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
```

## Caddy / Reverse Proxy Notes

- Terminate HTTPS at Caddy.
- Proxy API traffic to `api:8080`.
- Serve built `apps/guest/dist` for camera/album routes.
- Serve built `apps/admin/dist` for Admin Lite.
- Ensure SPA fallback to `index.html` for `/e/:eventId` and `/e/:eventId/album`.

## R2 Bucket CORS

The bucket must allow browser uploads from the guest app origin:

- Methods: `PUT`, `GET`, `HEAD`
- Headers: `Content-Type`, `*` if needed for signed headers
- Origins: your camera/admin domains
- Expose headers: `ETag`

## R2 Public Access Decision

The current MVP uses signed GET URLs for admin and album reads. The bucket does not need to be public. If you later use a CDN/public bucket for processed images, update the API and document the policy.

## PostgreSQL Backup Recommendation

- Nightly `pg_dump`.
- Retain at least 7 daily backups during beta.
- Test restore before the first real event.

## Restart Services

```bash
docker compose restart api
docker compose restart image-worker
docker compose restart guest dashboard
```

## Check Logs

```bash
docker compose logs -f api
docker compose logs -f image-worker
docker compose logs -f postgres
```

## MVP Production Caveat

This is beta MVP readiness, not enterprise production readiness. Keep early events small, monitor logs during the event, and have a manual backup/export plan.
