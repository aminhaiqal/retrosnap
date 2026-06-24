# RetroSnap Infra

The MVP infrastructure is intentionally small and VPS-friendly:

- `docker/docker-compose.dev.yml`: full local development stack.
- `minio/cors.json`: bucket CORS for browser direct uploads to local MinIO.
- `caddy/Caddyfile`: example reverse proxy hostnames for deployment.

Run the full local stack from the repository root:

```bash
cp .env.example .env
docker compose -f infra/docker/docker-compose.dev.yml up --build
```

The stack starts PostgreSQL, MinIO, migrations, the Go API, the image worker, the guest camera app, and Admin Lite.
