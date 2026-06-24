# RetroSnap

RetroSnap is a B2B digital disposable camera system for Malaysian weddings and events.

## MVP Apps

- `apps/guest`: guest camera and locked/revealed album routes.
- `apps/admin`: Admin Lite dashboard for events, QR links, moderation, and export links.
- `services/api`: Go upload coordination and admin/public album API.
- `services/image-worker`: Node/Sharp asynchronous image processor.

## Run The Development Stack

```bash
cp .env.example .env
docker compose up --build
```

The same full stack also lives under `infra/`:

```bash
docker compose -f infra/docker/docker-compose.dev.yml up --build
```

Then open:

- Guest app: `http://localhost:5173/e/demo-wedding-001`
- Album: `http://localhost:5173/e/demo-wedding-001/album`
- Admin Lite: `http://localhost:5175`
- API health: `http://localhost:8080/healthz`
- MinIO console: `http://localhost:9001`

The local stack includes PostgreSQL, MinIO with upload CORS, database migrations, the Go API, the image worker, the guest app, and Admin Lite.

## MVP Docs

- `docs/MVP_CHECKLIST.md`
- `docs/MVP_GAP_REPORT.md`
- `docs/MANUAL_TEST_PLAN.md`
- `docs/DEPLOYMENT_MVP.md`
