# RetroSnap MVP Gap Report

## What Was Found

- `apps/guest` already had a mobile-first camera engine, IndexedDB queue, offline-first capture, and real upload integration with the Go API.
- `services/api` already had upload coordination, guest sessions, presigned PUT URLs, upload confirmation, public event config, and Admin Lite endpoints.
- `services/image-worker` already had PostgreSQL polling, R2 download/upload, Sharp processing, retries, and tests.
- `apps/admin` already had Event Admin Lite for event creation, counts, and moderation.

## What Was Missing

- Guest event route `/e/:eventId` did not load event config from the API.
- Public album route `/e/:eventId/album` was missing.
- Public album API endpoint was missing.
- Admin event response did not include guest camera and album URLs.
- Dashboard did not show QR codes or export links.
- Required MVP admin endpoint aliases were missing:
  - `GET /api/v1/events`
  - `POST /api/v1/events`
  - `GET /api/v1/events/:eventId`
  - `GET /api/v1/events/:eventId/photos`
  - `PATCH /api/v1/photos/:photoId/moderation`
  - `POST /api/v1/events/:eventId/export`
- Moderation used upload status `hidden` instead of explicit `is_hidden` fields.
- Docker Compose and root MVP env example were missing.
- MVP readiness docs were missing.

## What Was Implemented By This Task

- Added `000006_add_photo_moderation_fields.sql` for `is_hidden`, `hidden_at`, and `hidden_reason`.
- Updated admin photo counts and moderation to use `is_hidden`.
- Added public album API: `GET /api/v1/events/:eventId/album`.
- Added signed GET URL support in the API storage abstraction.
- Added required admin endpoint aliases while preserving previous `/admin/*` routes.
- Added export-links fallback through `POST /api/v1/events/:eventId/export`.
- Added public guest/album URLs to event responses.
- Updated image worker pickup to skip hidden photos.
- Updated guest app routes:
  - `/e/:eventId`
  - `/e/:eventId/album`
- Added album locked/reveal UI with thumbnail grid and lightbox.
- Updated Admin Lite with guest URL, album URL, QR code, explicit hide/unhide, and export links.
- Added root `.env.example`.
- Added root `docker-compose.yml`.
- Added:
  - `docs/MVP_CHECKLIST.md`
  - `docs/MANUAL_TEST_PLAN.md`
  - `docs/DEPLOYMENT_MVP.md`

## What Could Not Be Completed

- ZIP generation was not implemented. The MVP uses signed export links instead.
- A full end-to-end dry run with a real camera, Postgres, MinIO/R2, processing worker, and album reveal was not executed in this session.
- Automated browser E2E tests were not added.
- Production Caddy configuration was not implemented.

## Exact Next Steps

1. Run `docker compose up --build`.
2. Open `http://localhost:5175`.
3. Use seeded `demo-wedding-001` or create a new event.
4. Scan/open the QR URL from a phone.
5. Execute `docs/MANUAL_TEST_PLAN.md`.
6. If the full flow passes, update `docs/MVP_CHECKLIST.md` final status to `READY_FOR_BETA`.
7. Add ZIP export only if signed-link export is insufficient for the first beta event.
