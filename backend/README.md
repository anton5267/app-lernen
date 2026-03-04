# Movie API Backend

## Start

```bash
npm install
npm run dev
npm run test
```

## Environment

Copy `.env.example` to `.env` and configure:

- `TMDB_API_KEY`
- `WATCH_REGION`
- `YOUTUBE_API_KEY`
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `ADMIN_EMAILS` (comma-separated admin emails, optional)
- `JWT_SECRET`
- `FRONTEND_ORIGIN`
- `TRUST_PROXY`
- `SECURITY_HEADERS_ENABLED`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `AUTH_RATE_LIMIT_MAX`
- `UPLOAD_RATE_LIMIT_MAX`
- `SHARE_CREATE_RATE_LIMIT_MAX`

## Routes

- `GET /api/health`
- `GET /api/config/status`
- `GET /api/search?query=<text>&type=<movie|tv|multi|youtube|twitch>&page=<number>`
- `GET /api/trending?type=<movie|tv>&page=<number>`
- `GET /api/movie/:id`
- `GET /api/tv/:id`
- `POST /api/auth/google` (body: `{ idToken }`)
- `POST /api/auth/demo` (body: `{ name? }`)
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/favorites` (auth)
- `GET /api/favorites/export` (auth)
- `POST /api/favorites/import` (auth, body: `{ mode, items }`)
- `GET /api/favorites/share` (auth)
- `POST /api/favorites/share` (auth, body: `{ title?, expiresInDays? }`)
- `DELETE /api/favorites/share/:id` (auth)
- `POST /api/favorites` (auth)
- `PATCH /api/favorites/:id` (auth)
- `DELETE /api/favorites/:id` (auth)
- `POST /api/upload` (auth, multipart `file`)
- `GET /api/share/:token` (public, returns 410 for expired links)

Security behavior:

- Security headers are enabled via `helmet` (can be disabled with `SECURITY_HEADERS_ENABLED=false`)
- API rate limits return `429` when exceeded
- TMDB details include watch providers (`movie/:id` and `tv/:id`)
- favorites import/export supports both `mediaType=movie|tv` and keeps backward compatibility for older JSON files without `mediaType`
- `/api/config/status` exposes only safe booleans/modes:
  - `sources.tmdb|youtube|twitch.{configured,mode}`
  - `google.configured`
- `/api/me` includes `user.isAdmin` based on `ADMIN_EMAILS`

## Storage

- Users/favorites/uploads metadata: `backend/data/db.json`
- Uploaded files: `backend/uploads/`
