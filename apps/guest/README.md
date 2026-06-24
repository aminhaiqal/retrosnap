# RetroSnap Guest Camera

Mobile-first Vite React prototype for RetroSnap's guest disposable-camera experience.

## Run locally

```bash
npm install
npm run dev
```

The camera API requires a secure context. `localhost` works for development; a phone on the same network will need HTTPS tunneling or a trusted local certificate.

## Scope

- Captures from the live camera stream.
- Stores JPEG blobs in IndexedDB before attempting upload.
- Shows a local queue/debug screen at `/queue`.
- Uses a mocked upload layer that can later be replaced with a presigned URL flow.

No authentication, backend, billing, dashboard, or real storage integration is included in this milestone.
