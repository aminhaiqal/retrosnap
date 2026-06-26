# RetroSnap Docker Infra

This folder contains the development Compose stack for the complete RetroSnap MVP.

From the repository root:

```bash
cp .env.example .env
docker compose -f infra/docker/docker-compose.dev.yml up --build
```

The root `docker-compose.yml` runs the same style of stack, so this also works:

```bash
docker compose up --build
```

## Services

- `postgres`: application database.
- `migrate`: applies SQL migrations and seeds `demo-wedding-001`.
- `api`: Go API on `http://localhost:8080`.
- `image-worker`: Node/Sharp photo processor.
- `guest`: guest camera and album app on `http://localhost:5173`.
- `dashboard`: Admin Lite on `http://localhost:5175`.

## Local URLs

- Admin Lite: `http://localhost:5175`
- Guest camera: `http://localhost:5173/e/demo-wedding-001`
- Album: `http://localhost:5173/e/demo-wedding-001/album`
- API health: `http://localhost:8080/healthz`

For phone testing, `localhost` points at the phone, not your laptop. Use your laptop LAN IP in `.env` for `PUBLIC_GUEST_APP_URL`, `PUBLIC_DASHBOARD_URL`, `PUBLIC_API_URL`, `VITE_RETROSNAP_API_BASE_URL`, and `CORS_ALLOWED_ORIGINS`. Keep `R2_*` pointed at Cloudflare R2.

## Useful Commands

```bash
docker compose -f infra/docker/docker-compose.dev.yml ps
docker compose -f infra/docker/docker-compose.dev.yml logs -f api
docker compose -f infra/docker/docker-compose.dev.yml logs -f image-worker
docker compose -f infra/docker/docker-compose.dev.yml down
docker compose -f infra/docker/docker-compose.dev.yml down -v
```
