# Movie Finder v2.1 QA Checklist

## 1. Auth and roles
- [ ] Demo login works (`/auth` -> `Продовжити як гість`).
- [ ] Google login works on `localhost` after OAuth setup.
- [ ] Google login works on ngrok URL after adding that origin in Google Cloud.
- [ ] `GET /api/me` returns `user.isAdmin=true` only for emails listed in `ADMIN_EMAILS`.

## 2. Search modes (Demo vs Real)
- [ ] `GET /api/config/status` returns:
  - `sources.tmdb|youtube|twitch.{configured,mode}`
  - `google.configured`
- [ ] Without TMDB key, movie/tv/multi tabs show demo behavior with clear fallback reason.
- [ ] Without YouTube/Twitch keys and empty query, tabs show demo recommendations (not empty hard-fail).
- [ ] With YouTube/Twitch keys and empty query, UI shows `query required` hint.
- [ ] In production build, debug mode labels are visible only for admin users.

## 3. Search UX and filters
- [ ] Debounced query updates results.
- [ ] Pagination changes result pages.
- [ ] TMDB catalog mode (for `Фільми`/`Серіали` with empty query) supports:
  - categories (`Популярні`, `У кіно`/`Сьогодні в ефірі`, `Скоро`/`В ефірі`, `Топ рейтингу`)
  - sort (`Популярність`, `Дата виходу`, `Рейтинг`, `Назва A-Z`)
  - watch-type filters (`Stream`, `Free`, `Ads`, `Rent`, `Buy`)
  - genre chips from `/api/genres`
- [ ] Catalog tabs (`Фільми`, `Серіали`, `Мікс TMDB`) support:
  - min rating filter
  - year filter
  - poster-only filter
  - sort by relevance/rating/A-Z
- [ ] Non-catalog tabs (`YouTube`, `Twitch`) do not show irrelevant rating/year controls.
- [ ] “До фільтрів / Після фільтрів” counters update correctly.
- [ ] Empty states are explicit:
  - missing keys
  - query required
  - no results
  - over-filtered list

## 4. Details pages (movie/tv)
- [ ] Backdrop/poster layout is stable on desktop and mobile.
- [ ] Trailer embed is shown when `trailerEmbedUrl` exists.
- [ ] Trailer fallback message appears when trailer is absent.
- [ ] Watch providers block:
  - real providers in real mode
  - neutral demo provider note in demo mode
- [ ] Cast and similar sections render correctly and handle empty data.

## 5. Collection and sharing
- [ ] Add to favorites works for both `movie` and `tv`.
- [ ] Deduplication key is `mediaType + tmdbId`.
- [ ] Edit favorite fields (watched, personal rating, notes) persists after refresh.
- [ ] Export JSON returns version 2 payload with `mediaType`.
- [ ] Import merge reports correct counters (`total/imported/skipped`).
- [ ] Share link lifecycle:
  - create
  - open read-only
  - import to own collection
  - expiration handling (`410` for expired)

## 6. Regression and quality
- [ ] Viewing history:
  - movie/tv detail opens create/update history entries
  - YouTube/Twitch external player creates history entries
  - `GET /api/history` returns latest entries sorted by `viewedAt`
  - `DELETE /api/history` clears only current user history
- [ ] History tab UX:
  - search by title/channel/year filters list correctly
  - type filter (`all/movie/tv/video`) filters list correctly
  - open item routes correctly to movie/tv/external screen
  - clear and refresh actions work
- [ ] `npm --prefix my-app-2 run lint`
- [ ] `npm --prefix my-app-2 run typecheck`
- [ ] `npm --prefix my-app-2 run test`
- [ ] `npm --prefix backend run test`
- [ ] Smoke test single-link mode (`backend:start` + `ngrok http 4000`)
