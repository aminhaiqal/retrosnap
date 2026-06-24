# RetroSnap Admin Lite

Small internal dashboard for demo event operations.

## Run

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5175` by default and calls the Go API at `VITE_RETROSNAP_API_BASE_URL`.

If `ADMIN_API_TOKEN` is set on the API, paste that token into the Admin token field. The token is stored locally in the browser and sent as a bearer token.

## Scope

- Create demo events.
- View event upload/processing/moderation counts.
- Review signed preview URLs for uploaded/processed photos.
- Hide or unhide photos before reveal.

This is not the full partner dashboard, billing, or authentication system.
