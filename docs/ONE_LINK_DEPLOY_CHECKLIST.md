# One-Link Deploy Checklist

Use this checklist when you want to share one public URL with a tester/friend.

## 1) Build web

From repository root:

```bash
npm run web:export
```

## 2) Start backend (serves API + built web)

```bash
npm run backend:start
```

Expected local checks:

- `http://localhost:4000/api/health`
- `http://localhost:4000/api/config/status`

## 3) Open tunnel

```bash
ngrok http 4000
```

Share the generated `https://<ngrok-domain>` URL.

## 4) Smoke check on public URL

- `https://<ngrok-domain>/`
- `https://<ngrok-domain>/api/health`
- `https://<ngrok-domain>/api/config/status`

## 5) Google OAuth reminder

Add your ngrok domain to Google Cloud OAuth client:

- Authorized JavaScript origins
- Test users list (for non-verified app mode)

Propagation can take 5-10 minutes.

## 6) Common note on Windows

`npm run web:export` may print `EPERM kill` after export.  
If `dist` is created and route list is printed, treat export as success.

