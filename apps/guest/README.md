# RetroSnap Guest Camera

Mobile-first Vite React prototype for RetroSnap's guest disposable-camera experience.

## Run locally

```bash
npm install
npm run dev
```

To point the sync engine at the Go API, set:

```bash
VITE_RETROSNAP_API_BASE_URL=http://localhost:8080
```

The camera API requires a secure context. `localhost` works for development; a phone on the same network will need HTTPS tunneling or a trusted local certificate.

## Scope

- Captures from the live camera stream.
- Stores JPEG blobs in IndexedDB before attempting upload.
- Shows a local queue/debug screen at `/queue`.
- Requests presigned upload URLs from the Go API, uploads blobs directly to object storage, then confirms metadata with the API.

No dashboard, billing, partner management, or image processing worker is included in this milestone.
