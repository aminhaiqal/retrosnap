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

To run the guest camera without the API, enable the mock API:

```bash
VITE_RETROSNAP_MOCK_API=true npm run dev
```

Mock mode uses the built-in demo event, marks captured photos as uploaded locally, and shows local captures in the album route.

The camera API requires a secure context. `localhost` works for development; a phone on the same network will need HTTPS tunneling or a trusted local certificate.

Event routes:

- Camera: `/e/{eventId}`
- Album: `/e/{eventId}/album`

## Scope

- Captures from the live camera stream.
- Stores JPEG blobs in IndexedDB before attempting upload.
- Shows a local queue/debug screen at `/queue`.
- Requests presigned upload URLs from the Go API, uploads blobs directly to object storage, then confirms metadata with the API.
- Shows the public album as locked before reveal time and processed/non-hidden photos after reveal.

No dashboard, billing, partner management, or image processing worker is included in this milestone.
