# Deploy Backend to Render (Permanent URL)

This guide gives you a stable backend domain (instead of temporary ngrok).

## 1) One-click deploy

Open:

`https://render.com/deploy?repo=https://github.com/anton5267/app-lernen`

Render will detect `render.yaml` and create `movie-finder-backend`.

## 2) Fill required environment variables in Render

In Render service settings, set real values for:

- `TMDB_API_KEY`
- `YOUTUBE_API_KEY`
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `ADMIN_EMAILS` (optional)

Already preconfigured by blueprint:

- `NODE_ENV=production`
- `FRONTEND_ORIGIN=https://anton5267.github.io`
- `DATA_DIR=/var/data`
- `UPLOADS_DIR=/var/data/uploads`

If you also use local dev and other public hosts, extend `FRONTEND_ORIGIN` with comma-separated origins.

## 3) Verify backend

After deployment, you get URL like:

`https://movie-finder-backend.onrender.com`

Check:

- `/api/health`
- `/api/config/status`

## 4) Connect GitHub Pages frontend to Render backend

Update GitHub repository variable:

```bash
gh variable set EXPO_PUBLIC_API_BASE_URL --repo anton5267/app-lernen --body "https://movie-finder-backend.onrender.com"
```

Then redeploy Pages:

```bash
gh workflow run "Deploy GitHub Pages" --repo anton5267/app-lernen
```

## 5) Google OAuth for production domain

In Google Cloud OAuth client, add:

- `Authorized JavaScript origins`: `https://anton5267.github.io`
- Keep localhost origin for local testing.

Wait 5-10 minutes for propagation.

## Notes

- Free Render plan may spin down after inactivity.
- Persistent disk is configured in `render.yaml` so local JSON data/uploads survive restarts.
