# Movie Finder Architecture (v2.1)

## Backend (`backend/src`)

### Entry point
- `server.js`: app bootstrap and wiring only.

### Route modules
- `routes/contentRoutes.js`: health/config/search/trending/movie/tv endpoints.
- `routes/authRoutes.js`: auth (`google/local/demo`), `me`, profile and settings.
- `routes/favoriteRoutes.js`: favorites CRUD + import/export.
- `routes/shareRoutes.js`: share-link CRUD + public share payload.
- `routes/historyRoutes.js`: viewing history CRUD.
- `routes/uploadRoutes.js`: upload endpoint.

### Domain helpers
- `tmdb.js`: TMDB search/details/watch providers/trending mapping.
- `videoPlatforms.js`: YouTube/Twitch real/demo sources.
- `favorites.js`: favorite parsing/normalization helpers.
- `history.js`: history parsing/normalization helpers.
- `share.js`: share validation/mapping helpers.
- `auth.js`: JWT/cookie auth + Google token verification.
- `user.js`: user mapping + settings/profile parsing.
- `password.js`: hash/verify/strength validation.
- `db.js`: JSON persistence + migration/normalization.
- `http.js`: CORS and rate-limit configuration helpers.
- `sources.js`: source mode detection (`real/demo`) + log formatting.
- `uploads.js`: multer middleware factory + upload error normalization.

## Frontend (`my-app-2`)

### App routes
- `app/(tabs)/index.tsx`: search screen.
- `app/(tabs)/explore.tsx`: collection screen.
- `app/(tabs)/history.tsx`: viewing history.
- `app/auth.tsx`: auth screen.
- `app/movie/[id].tsx`, `app/tv/[id].tsx`: details screens.
- `app/shared/[token].tsx`: read-only shared collection.
- `app/external.tsx`: youtube/twitch external player fallback screen.

### Core layers
- `services/movieApi.ts`: typed API client for backend.
- `context/AppContext.tsx`: auth/session/favorites/history actions.
- `features/*`: pure business helpers and tests.
- `components/*`: reusable UI building blocks.
- `theme/tokens.ts`: design tokens for all themes.
- `types/api.ts`: shared frontend API contracts.

## Testing
- Backend: `backend/tests/*` (integration + unit).
- Frontend: `my-app-2/**/*.test.ts(x)` (feature/component tests).
- CI workflow: `.github/workflows/ci.yml`.

## Extension pattern
1. Add domain helpers in `backend/src/<domain>.js` (pure logic).
2. Add route registration in `backend/src/routes/<domain>Routes.js`.
3. Wire the route module in `backend/src/server.js`.
4. Add backend tests for behavior and fallback/error paths.
5. Add/adjust frontend `services` + `features` tests.
6. Keep UI state glue thin in route screens; move reusable logic to `features`.
