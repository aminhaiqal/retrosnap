# RetroSnap Infra

The MVP infrastructure is intentionally small and VPS-friendly:

- `docker/docker-compose.dev.yml`: full local development stack.
- `r2/cors.presigned-local.json`: example Cloudflare R2 CORS for browser direct uploads.
- `caddy/Caddyfile`: example reverse proxy hostnames for deployment.

Run the full local stack from the repository root:

```bash
cp .env.example .env
docker compose -f infra/docker/docker-compose.dev.yml up --build
```

The stack starts PostgreSQL, migrations, the Go API, the image worker, the guest camera app, and Admin Lite. Object storage is Cloudflare R2.
