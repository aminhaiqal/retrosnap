# Manual MVP Test Plan

## End-To-End Dry Run

1. Start Postgres, API, image worker, guest app, dashboard, and local object storage:
   ```bash
   docker compose up --build
   ```
2. Confirm migrations ran in the `migrate` service logs.
3. Open dashboard: `http://localhost:5175`.
4. Enter `ADMIN_TOKEN` if configured.
5. Create a demo event or use seeded `demo-wedding-001`.
6. Confirm dashboard shows guest camera URL and album URL.
7. Confirm QR code is displayed.
8. Copy or scan guest camera URL.
9. Open guest camera URL on phone: `/e/{eventId}`.
10. Allow camera permission.
11. Turn on Flight Mode.
12. Take 5 photos.
13. Confirm frame counter decreases.
14. Open local queue/debug screen.
15. Confirm local queue contains 5 photos.
16. Refresh the page.
17. Confirm the 5 photos still exist locally.
18. Turn off Flight Mode.
19. Keep app open and online.
20. Confirm photos upload to object storage.
21. Confirm Go API marks photos `uploaded` in PostgreSQL.
22. Confirm image worker marks photos `processed`.
23. Open dashboard event detail.
24. Confirm photos appear in moderation grid.
25. Hide one photo.
26. Open album before reveal time: `/e/{eventId}/album`.
27. Confirm album is locked and does not show the grid.
28. Change reveal time to now/past in the database for the test:
   ```sql
   UPDATE events SET reveal_at = now() - interval '1 minute' WHERE id = '<eventId>';
   ```
29. Open album again.
30. Confirm only processed, non-hidden photos appear.
31. Open one photo in the lightbox.
32. Run export from Admin Lite.
33. Confirm exported links exclude the hidden photo.

## Useful Checks

```bash
curl http://localhost:8080/healthz
docker compose logs api
docker compose logs image-worker
docker compose exec postgres psql -U retrosnap -d retrosnap -c "SELECT upload_status, is_hidden, count(*) FROM photos GROUP BY upload_status, is_hidden;"
```
