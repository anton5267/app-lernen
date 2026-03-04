# Movie Finder (app-lernen)

Production-ready full-stack app for movie and TV discovery with real-data search, personal collection management, and shareable lists.

## Live links

- Web app (GitHub Pages): `https://anton5267.github.io/app-lernen/`
- Repository: `https://github.com/anton5267/app-lernen`
- Issues: `https://github.com/anton5267/app-lernen/issues`

## What this app provides

- TMDB-powered search and browse (`Movies`, `TV`, `Mixed TMDB`)
- YouTube and Twitch search tabs with web-safe external fallback
- Google OAuth + demo auth mode
- Personal collection (favorites, status, rating, notes)
- Import/export JSON and share links with expiration
- Source-mode transparency (`real` / `demo`) and safe fallback hints

## Repository structure

- `my-app-2/`: Expo Router frontend
- `backend/`: Express API (TMDB proxy, Google auth, favorites, upload, import/export)
- `docs/REAL_MODE_SETUP.md`: real-data setup runbook
- `docs/QA_CHECKLIST_V2_1.md`: QA checklist for demo/real/admin scenarios
- `docs/ARCHITECTURE.md`: backend/frontend module map and extension pattern
- `docs/ONE_LINK_DEPLOY_CHECKLIST.md`: single-link deploy flow
- `docs/RELEASE_POST_TEMPLATE_UA.md`: release post template

## Quick start

From the repository root:

```bash
npm install
npm run setup
npm run backend
npm run web
```

For single-port mode (backend + built web frontend on `:4000`):

```bash
npm run web:export
npm run backend:start
```

The root scripts proxy to `my-app-2`, so you can also run:

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run backend`
- `npm run backend:start`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:backend`
- `npm run test:all`

## Project layout

- `my-app-2/`: active frontend app
- `backend/`: REST API + local JSON persistence (`backend/data/db.json`)
- `.github/workflows/ci.yml`: frontend quality checks

## Environment

1. Copy `backend/.env.example` to `backend/.env`
2. Copy `my-app-2/.env.example` to `my-app-2/.env`
3. Set:
   - `TMDB_API_KEY`
   - `WATCH_REGION` (for TMDB watch providers, e.g. `UA`)
   - `YOUTUBE_API_KEY` (optional, for YouTube search)
   - `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` (optional, for Twitch search)
   - `GOOGLE_CLIENT_ID` (backend)
   - `ADMIN_EMAILS` (optional, comma-separated emails that can see debug indicators in production)
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (frontend, same value for web flow)
   - `FRONTEND_ORIGIN` (comma-separated if you use localhost + ngrok)
   - optional security/rate-limit vars from `backend/.env.example`

If external API keys are empty, backend switches to built-in demo mode for those sources.
Frontend supports client-side search filters (rating/year/poster), search sorting, collection search/stats, and favorites export/import (JSON).
When search is empty, frontend shows trending list from `GET /api/trending` (movie/tv).

Security note: keep all API keys and OAuth secrets only in local `.env` files (`backend/.env`, `my-app-2/.env`). Never commit real secrets to git.

`GET /api/config/status` returns safe runtime integration status:

```json
{
  "sources": {
    "tmdb": { "configured": false, "mode": "demo" },
    "youtube": { "configured": false, "mode": "demo" },
    "twitch": { "configured": false, "mode": "demo" }
  },
  "google": { "configured": true }
}
```

### Favorites transfer API

- `GET /api/favorites/export` -> exports current user collection
- `POST /api/favorites/import` -> imports array of items for current user
  - body: `{ "mode": "merge" | "replace", "items": [...] }`
  - dedupe key: `mediaType + tmdbId` (movie/tv supported)
- `GET /api/favorites/share` -> list user share links
- `POST /api/favorites/share` -> create share link
  - body (optional): `{ "title": "...", "expiresInDays": 7 }`
- `DELETE /api/favorites/share/:id` -> remove share link
- `GET /api/share/:token` -> public read-only shared collection
  - returns `410` if share link is expired

### Viewing history API

- `GET /api/history?limit=50` -> returns latest viewing history for current user
- `POST /api/history` -> upsert history record by key `mediaType + contentId`
  - body: `{ "mediaType": "movie|tv|youtube|twitch", "contentId": "...", "title": "...", ... }`
- `DELETE /api/history` -> clears current user history

### TMDB catalog API (TMDB-style browse)

- `GET /api/genres?type=movie|tv` -> returns available TMDB genres
- `GET /api/catalog` -> browse with categories + filters
  - query params:
    - `type=movie|tv`
    - `category=popular|now_playing|upcoming|top_rated|airing_today|on_the_air`
    - `sort=popularity.desc|primary_release_date.desc|first_air_date.desc|vote_average.desc|title.asc|name.asc`
    - `minRating=0..10`
    - `yearFrom=YYYY`, `yearTo=YYYY`
    - `genres=28,878`
    - `watchTypes=flatrate,free,ads,rent,buy`

## Google OAuth (web)

If you use Google sign-in on web, configure the same OAuth client in Google Cloud:

- `Authorized JavaScript origins`
  - `http://localhost:19007`
  - your public domain (for example ngrok URL)

Then add your Gmail to `Test users` and wait 5-10 minutes for settings propagation.
Note: web login uses Google Identity Services and normally does not require redirect URI setup.
If you run native auth flow, use the URI shown on `/auth` in `Redirect URI (з OAuth-запиту)`.

## Auth fallback

If Google OAuth is still propagating, use the `Продовжити як гість` button on `/auth`.
This uses backend endpoint `POST /api/auth/demo` and unlocks favorites/upload for local testing.

## Share Link With Friend

1. Build frontend static files:
   - `npm run web:export`
2. Start backend (it serves API and built frontend from `my-app-2/dist`):
   - `npm run backend:start`
3. Start one tunnel:
   - `ngrok http 4000`
4. Share the ngrok URL.
5. Quick checks on the same URL:
   - `/api/health`
   - `/api/config/status`

Note: Free ngrok may show a warning page first; click continue once.  
For Google OAuth on this public URL, add the ngrok domain to `Authorized JavaScript origins`.
On Windows, `npm run web:export` includes a safe wrapper for a known `expo export` post-build `EPERM` process error.

## GitHub Pages (frontend link like `github.io/<repo>/`)

This repo includes workflow `.github/workflows/pages.yml` that deploys `my-app-2/dist` to:

- `https://anton5267.github.io/app-lernen/`

One-time setup in GitHub repository settings:

1. `Settings -> Pages -> Build and deployment -> Source: GitHub Actions`
2. `Settings -> Secrets and variables -> Actions -> Variables`
   - `EXPO_PUBLIC_API_BASE_URL` = your public backend URL (for example your ngrok or server domain)
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID` = your Google web client id

Without `EXPO_PUBLIC_API_BASE_URL`, GitHub Pages will open UI but API calls will default to current origin.

### Post-push quick verification

After every push to `master`, verify:

1. `https://github.com/anton5267/app-lernen` opens and README renders correctly.
2. `npm run test:all` is green locally.
3. single-port mode still works:
   - `npm run web:export`
   - `npm run backend:start`
   - `http://localhost:4000/api/health`
   - `http://localhost:4000/api/config/status`

## Docker Compose

Build and run everything in one container:

```bash
npm run docker:build
npm run docker:up
```

Service will be available at `http://localhost:4000`.
Persistent data is stored in:

- `backend/data`
- `backend/uploads`

## Release Notes (2026-03-04)

- Shipped Movie Finder v2.2 in single-port mode (`backend` serves API + exported web build).
- Completed real/demo source-state UX for TMDB/YouTube/Twitch with explicit fallback reasons.
- Optimized external search behavior: in real mode, empty YouTube/Twitch query no longer sends unnecessary `/api/search` request.
- Improved web external screen: clear message that embedded player is unavailable on web, with direct "Open original" fallback.
- Refined result cards and mobile-first layout for search/collection/details/share screens.
- Hardened stability: request dedupe/cache updates, safer GET retry logic, session/theme sync improvements.
- QA hardening delivered: filters/sorting/pagination smoke coverage and updated operational docs/runbook.
