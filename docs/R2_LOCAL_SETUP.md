# Cloudflare R2 Local Setup

RetroSnap is already built for R2/S3-compatible object storage:

- the Go API creates presigned `PUT` upload URLs from `R2_*` env vars
- the image worker downloads originals and uploads processed images from `R2_*` env vars

## 1. Create R2 Credentials

In Cloudflare:

1. Open **R2 object storage**.
2. Create or choose a bucket, for example `retrosnap-photos`.
3. Create an R2 API token with **Object Read & Write** permission scoped to that bucket.
4. Save the Access Key ID and Secret Access Key somewhere safe.
5. Copy the S3 API endpoint:

```txt
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Use the jurisdiction-specific endpoint instead if the bucket was created in a special jurisdiction.

## 2. Configure Bucket CORS

For browser uploads through presigned URLs, the R2 bucket needs CORS.

Use `infra/r2/cors.presigned-local.json` as a local testing policy. Replace `192.168.0.157` with your current machine IP if needed, then paste it into:

```txt
R2 bucket -> Settings -> CORS Policy -> Add CORS policy -> JSON
```

For production, replace local origins with your real camera/admin domains.

## 3. Switch Local Docker To R2

```bash
cp env.r2.example .env
```

Edit `.env` and replace:

```txt
R2_ENDPOINT
R2_BUCKET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
PUBLIC_* URLs if your LAN IP changed
VITE_RETROSNAP_API_BASE_URL if your LAN IP changed
CORS_ALLOWED_ORIGINS if your LAN IP changed
```

Then recreate the services that read storage/browser env and remove any old local-storage containers from earlier versions:

```bash
docker compose up -d --remove-orphans --force-recreate api image-worker guest dashboard
```

There is no local object-storage service in the current Compose stack.

## 4. Smoke Test

```bash
node scripts/smoke-upload.mjs
```

Successful output should end with:

```json
{
  "confirmedStatus": "uploaded",
  "finalStatus": "processed"
}
```

The `uploadUrlHost` should be your Cloudflare R2 endpoint.
