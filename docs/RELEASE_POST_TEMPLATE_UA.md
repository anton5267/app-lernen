# Release Post Template (UA)

Нижче готовий шаблон для GitHub/Telegram/Discord після оновлення.

---

## Movie Finder v2.2 — оновлення

Репозиторій: https://github.com/anton5267/app-lernen

Що зроблено:

- Пошук і режими даних стабілізовано для TMDB / YouTube / Twitch.
- Для YouTube/Twitch з порожнім запитом у real mode немає зайвого API-виклику, показується чітка підказка.
- Покращено UX зовнішнього плеєра на web: зрозумілий fallback і кнопка «Відкрити оригінал».
- Дороблено колекцію, імпорт/експорт, share-лінки, теми, QA-харднінг і документацію.

Перевірки:

- Frontend: `typecheck`, `lint`, `test` — пройдено.
- Backend: `test` — пройдено.
- `web:export` виконано, `dist` створено.
- Health/status smoke: `/api/health`, `/api/config/status`.

Як запустити:

```bash
npm run web:export
npm run backend:start
ngrok http 4000
```

Після цього можна дати одну URL другу/тестеру.

---

Короткий QA-фокус для ретесту:

1. YouTube/Twitch: порожній query не викликає `/api/search`.
2. YouTube/Twitch: `valorant` повертає результати, `Відкрити оригінал` працює.
3. TMDB вкладки: фільтри/сортування/пагінація без регресій.
4. Колекція + share + auth працюють стабільно.

