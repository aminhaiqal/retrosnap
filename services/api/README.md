# RetroSnap API

Lightweight Go upload coordination API for the RetroSnap guest camera.

The API does not receive photo blobs. It creates Cloudflare R2/S3-compatible presigned `PUT` URLs, lets the guest browser upload directly to object storage, and persists upload metadata in PostgreSQL.

## Endpoints

- `GET /healthz`
- `GET /api/v1/events/{eventId}/public`
- `POST /api/v1/events/{eventId}/guest-sessions`
- `POST /api/v1/uploads/presign`
- `POST /api/v1/uploads/confirm`
- `GET /api/v1/photos/{photoId}/status`

## Local Setup

```bash
cp .env.example .env
go mod download
```

Create the PostgreSQL database, then apply migrations in order:

```bash
psql "$DATABASE_URL" -f migrations/000001_create_events.sql
psql "$DATABASE_URL" -f migrations/000002_create_guest_sessions.sql
psql "$DATABASE_URL" -f migrations/000003_create_photos.sql
psql "$DATABASE_URL" -f migrations/000004_seed_demo_event.sql
```

Run the API:

```bash
go run ./cmd/api
```

## Configuration

All config is loaded from environment variables. Development defaults are provided only where safe; storage credentials and bucket settings are still required because presigning needs real R2/S3 credentials.

```txt
APP_ENV=development
HTTP_ADDR=:8080
DATABASE_URL=postgres://retrosnap:retrosnap@localhost:5432/retrosnap?sslmode=disable
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
GUEST_TOKEN_SECRET=change-me-in-production
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=retrosnap-photos
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_FORCE_PATH_STYLE=true
PRESIGNED_UPLOAD_TTL_SECONDS=900
MAX_UPLOAD_SIZE_BYTES=8388608
```

Set a strong `GUEST_TOKEN_SECRET` in production. Guest tokens are returned once to the client and only a keyed hash is stored in PostgreSQL.
