# RetroSnap MVP Checklist

## MVP Definition

RetroSnap MVP proves one complete small-event flow:

Planner creates or opens an event, shares a QR guest camera link, guests capture blind disposable-style photos offline-first, originals upload to object storage through presigned URLs, metadata persists in PostgreSQL, the image worker processes photos, admin moderates them, the public album remains locked until reveal time, and visible processed photos can be exported as signed links.

## Completed Features

- Guest camera Vite app in `apps/guest`.
- Event-specific guest route: `/e/:eventId`.
- Public album route: `/e/:eventId/album`.
- Camera permission handling, rear camera preference, disposable viewfinder, frame counter, shutter, and film wind animation.
- No preview, retake, edit, or delete controls on the main camera screen.
- JPEG Blob capture saved to IndexedDB before upload attempts.
- Local queue/debug screen.
- Online/visible retry sync manager.
- Real Go API upload flow: guest session, presign, direct PUT, confirm.
- Go API health, public event, guest session, upload, photo status, admin event/photo/moderation, album, and export-links endpoints.
- PostgreSQL migrations for events, guest sessions, photos, processing fields, and moderation fields.
- Image worker polling PostgreSQL with `FOR UPDATE SKIP LOCKED`.
- Image worker processing pipeline with Malaysian Vintage filter, optional timestamp overlay, display image, thumbnail, retries, and low default concurrency.
- Admin Lite dashboard in `apps/admin`.
- Admin event list/create/detail, guest camera URL, album URL, QR code, stats, moderation grid, hide/unhide, and export links.
- Docker Compose development stack with Postgres, migrator, API, image worker, guest app, dashboard app, and Cloudflare R2 object storage configuration.
- `infra/` folder with Compose, R2 CORS example, and Caddy reverse proxy example.

## Missing Features

- ZIP export is not implemented. MVP export returns temporary signed processed-image links through `POST /api/v1/events/:eventId/export`.
- Full login/user accounts are not implemented. Admin endpoints use `ADMIN_TOKEN`.
- Public album uses temporary signed URLs from the API; long-lived public CDN URLs are not configured.
- No admin UI for editing reveal time after event creation.
- No automated browser end-to-end test yet.

## Blockers

- A real dry run still needs environment configuration and running infrastructure: PostgreSQL migrations plus Cloudflare R2 object storage.
- R2 bucket CORS must allow browser `PUT` for direct uploads.

## Manual End-to-End Test Plan

See `docs/MANUAL_TEST_PLAN.md`.

## Deployment Checklist

- Copy `.env.example` to `.env` and set production-safe secrets.
- Set `ADMIN_TOKEN` and `GUEST_TOKEN_SECRET`.
- Configure R2 credentials and bucket CORS.
- Run database migrations.
- Start API, image worker, guest app, and dashboard.
- Confirm `/healthz` returns ok.
- Create or open an event in Admin Lite.
- Verify guest QR opens `/e/:eventId`.
- Complete the manual test plan.

## Known Limitations

- PostgreSQL polling is used instead of an external queue.
- Image filter is approximate and needs tuning with real wedding photos.
- Timestamp overlay uses generic SVG text.
- Export is signed links, not a ZIP.
- Docker Compose is development-oriented, not hardened production orchestration.
- No dashboard authentication beyond a shared admin token.

## Final Status

**NEEDS_FIXES**

The MVP code paths are implemented and build/test commands pass, but this repository has not been proven with a real end-to-end dry run against running Postgres plus object storage in this session. Mark `READY_FOR_BETA` after the manual test plan passes with real captures, uploads, processing, moderation, album reveal, and export-links verification.
