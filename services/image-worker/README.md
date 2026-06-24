# RetroSnap Image Worker

Asynchronous image processor for uploaded RetroSnap originals.

The guest camera uploads original JPEGs directly to Cloudflare R2/S3-compatible storage and confirms metadata with the Go API. This worker runs outside that upload path so guest uploads stay fast and safe. It polls PostgreSQL for uploaded photos, locks a small batch, downloads originals from R2, creates display and thumbnail images, uploads those derivatives, and marks the photo as processed.

## Database Setup

Apply the API migration before starting the worker:

```bash
psql "$DATABASE_URL" -f ../api/migrations/000005_add_photo_processing_fields.sql
```

## Polling And Locking

The worker claims jobs with a PostgreSQL transaction using `FOR UPDATE SKIP LOCKED`. It picks photos with:

- `upload_status = 'uploaded'`
- retryable `failed` rows whose `next_processing_retry_at` has arrived
- stale `processing` rows older than `WORKER_STALE_PROCESSING_MINUTES`

Claiming sets `upload_status = 'processing'`, increments `processing_attempts`, sets `processing_started_at`, and clears the previous `error_message`.

## Object Keys

Originals are left untouched:

```txt
events/{eventId}/originals/{guestSessionId}/{localPhotoId}.jpg
```

Generated files are uploaded to:

```txt
events/{eventId}/processed/{guestSessionId}/{localPhotoId}.jpg
events/{eventId}/thumbs/{guestSessionId}/{localPhotoId}.jpg
```

## Image Pipeline

The worker uses `sharp` to:

- auto-rotate the original from metadata
- generate a warm, subtle "Malaysian Vintage" display JPEG
- optionally add an orange Malaysia-time timestamp overlay
- generate a smaller thumbnail from the processed image style

The filter is intentionally approximate and should be tuned with real wedding photos.

## Retry Behavior

Retry schedule:

- attempt 1: 30 seconds
- attempt 2: 2 minutes
- attempt 3: 10 minutes
- attempt 4: 30 minutes
- attempt 5+: 2 hours

Retries stop after `MAX_PROCESSING_ATTEMPTS` and the row remains `failed` with no automatic retry time.

## Environment

```txt
NODE_ENV=development
DATABASE_URL=postgres://retrosnap:retrosnap@localhost:5432/retrosnap?sslmode=disable
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=retrosnap-photos
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_FORCE_PATH_STYLE=true
WORKER_CONCURRENCY=1
WORKER_BATCH_SIZE=5
WORKER_POLL_INTERVAL_MS=5000
WORKER_STALE_PROCESSING_MINUTES=15
MAX_PROCESSING_ATTEMPTS=8
PROCESSED_MAX_WIDTH=1800
PROCESSED_JPEG_QUALITY=84
THUMBNAIL_MAX_WIDTH=480
THUMBNAIL_JPEG_QUALITY=76
ENABLE_TIMESTAMP_OVERLAY=true
TIMEZONE=Asia/Kuala_Lumpur
```

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

## Test

```bash
npm run typecheck
npm run build
npm test
```

## Docker

```bash
docker build -t retrosnap-image-worker .
docker run --env-file .env retrosnap-image-worker
```

## MVP Limitations

- No external queue yet.
- Worker uses PostgreSQL polling.
- Timestamp overlay uses generic SVG text, not a custom camera font.
- Filter is approximate and should be tuned with real wedding photos.
- No admin UI yet for manual reprocessing.
- No album reveal page yet.
