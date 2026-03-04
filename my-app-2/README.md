# Movie Learning App (Expo Router)

Frontend for a full movie service:

- real search via backend (`/api/search`) and TMDB proxy
- movie detail page (`/api/movie/:id`)
- Google login (ID token -> backend verification)
- protected favorites collection (`/api/favorites`)
- optional video upload (`/api/upload`)

## Features

- Search with debounce and pagination
- Search types: movies / TV / mixed TMDB / YouTube / Twitch
- Trending list when search is empty (movie/tv)
- Search sorting (relevance / rating / A-Z)
- Search filters (min rating / year / with poster)
- Demo mode badge when backend runs without TMDB key
- Clear source state banners (`Real` / `Demo`) with fallback reasons/hints
- Movie and TV details screens with watch providers, cast and similar titles
- Embedded player screen for YouTube/Twitch content
- Google sign-in and server session cookie
- Demo sign-in fallback (without Google) for local testing
- Favorites: add/edit/delete, watched status, personal rating, notes
- Favorites support TMDB movies + TV shows (dedupe key: mediaType + tmdbId)
- Collection search and watch statistics
- Theme modes (`system` / `light` / `warm` / `dark`)
- Upload video file from collection screen
- Favorites export/import in JSON format
- Public share links for read-only collection view
- Optional share-link expiration (1-365 days or no expiration)
  - Shared page supports import to your own collection (after login)

## Release Notes (v2.2)

- Real/demo data mode UX was finalized for all search sources.
- Empty query in `youtube/twitch` real mode is handled locally with clear `query required` hint (no extra backend request).
- External web screen now shows explicit fallback text and prioritizes "Відкрити оригінал".
- Search result cards for external sources were compacted for better visibility of primary actions.
- Additional stability improvements: cache/read dedupe, request retry hardening, and refreshed QA scenarios.

## Scripts

```bash
npm run start
npm run web
npm run android
npm run ios
npm run lint
npm run typecheck
npm run test
```

## Environment

Create `.env` in `my-app-2`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

If `EXPO_PUBLIC_API_BASE_URL` is not set, web uses `window.location.origin`.
If it is set to `http://localhost:4000` but the app runs on a public host (for example ngrok), it auto-switches to the current origin.

Search UX modes:

- TMDB without key -> demo catalog + explicit fallback reason
- YouTube/Twitch without keys -> demo recommendations (including empty query)
- YouTube/Twitch with keys + empty query -> clear `query required` hint
- On web external screen (`/external`), if embedded playback is unsupported, user gets direct "Відкрити оригінал" path.

In production, technical debug indicators are shown only for admin users (`user.isAdmin` from backend).

## OAuth notes

Web uses Google Identity Services (`@react-oauth/google`), so for local/ngrok web login configure:

- `Authorized JavaScript origins`:
  - `http://localhost:19007`
  - your public web domain (for example ngrok URL)

For native OAuth flow (Expo Auth Session), `/auth` also shows:

- `Redirect URI (очікуваний)`
- `Redirect URI (з OAuth-запиту)`

Use that runtime value in Google Cloud -> OAuth Client -> `Authorized redirect URIs`.

## Favorites transfer format

Exported JSON contains:

- `version`
- `exportedAt`
- `items` (array of favorite movie objects)

Import accepts the same file (or plain `items` array) in merge mode.

## Quality

- ESLint (`expo lint`)
- TypeScript strict mode (`tsc --noEmit`)
- Jest tests (`jest-expo` preset)
- GitHub Actions workflow: `.github/workflows/ci.yml`
