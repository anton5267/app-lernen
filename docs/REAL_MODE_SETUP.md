# Movie Finder v2.1 Real-Mode Setup

## 1. Backend `.env`
Copy `backend/.env.example` to `backend/.env` and set:

```env
TMDB_API_KEY=...
YOUTUBE_API_KEY=...
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
ADMIN_EMAILS=admin1@example.com,admin2@example.com
FRONTEND_ORIGIN=http://localhost:19007,https://your-ngrok-domain.ngrok-free.app
```

Notes:
- `TMDB_API_KEY` is required for real movie/tv/multi data.
- `YOUTUBE_API_KEY`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` are optional, with controlled demo fallback.
- `ADMIN_EMAILS` controls who sees debug labels in production.

## 2. Frontend `.env`
Copy `my-app-2/.env.example` to `my-app-2/.env` and set:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
```

## 3. Google OAuth web checklist
In Google Cloud OAuth client:
- Add `http://localhost:19007` to `Authorized JavaScript origins`
- Add your ngrok https domain to `Authorized JavaScript origins`
- Add test users in OAuth Audience
- Wait 5-10 minutes for propagation

## 4. Run local
From repo root:

```bash
npm run setup
npm run backend
npm run web
```

Health checks:
- `http://localhost:4000/api/health`
- `http://localhost:4000/api/config/status`

## 5. One-link sharing mode
Build web and serve from backend:

```bash
npm run web:export
npm run backend:start
ngrok http 4000
```

Share ngrok URL with tester/friend.
