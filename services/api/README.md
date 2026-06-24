# RetroSnap API

Lightweight Go upload coordination API for the RetroSnap guest camera.

The API does not receive photo blobs. It creates Cloudflare R2/S3-compatible presigned `PUT` URLs, lets the guest browser upload directly to object storage, and persists upload metadata in PostgreSQL.

## Endpoints

- `GET /healthz`
- `GET /api/v1/events/{eventId}/public`
- `GET /api/v1/events/{eventId}/album`
- `GET /api/v1/events`
- `POST /api/v1/events`
- `GET /api/v1/events/{eventId}`
- `GET /api/v1/events/{eventId}/photos`
- `PATCH /api/v1/photos/{photoId}/moderation`
- `POST /api/v1/events/{eventId}/export`
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
psql "$DATABASE_URL" -f migrations/000005_add_photo_processing_fields.sql
psql "$DATABASE_URL" -f migrations/000006_add_photo_moderation_fields.sql
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
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
GUEST_TOKEN_SECRET=change-me-in-production
ADMIN_TOKEN=dev-admin-token
PUBLIC_GUEST_APP_URL=http://localhost:5173
PUBLIC_DASHBOARD_URL=http://localhost:5175
PUBLIC_API_URL=http://localhost:8080
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=retrosnap-photos
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_FORCE_PATH_STYLE=true
PRESIGNED_UPLOAD_TTL_SECONDS=900
ADMIN_SIGNED_URL_TTL_SECONDS=600
MAX_UPLOAD_SIZE_BYTES=8388608
```

Set a strong `GUEST_TOKEN_SECRET` in production. Guest tokens are returned once to the client and only a keyed hash is stored in PostgreSQL.

Admin Lite endpoints use `Authorization: Bearer <ADMIN_TOKEN>` or `X-Admin-Token`. In development, leaving `ADMIN_TOKEN` empty disables the guard; production requires it.

`POST /api/v1/events/{eventId}/export` returns temporary signed links for processed, non-hidden photos. ZIP generation is deferred beyond MVP.
