# Deploying to Render

The frontend is a Vite + React static site. Deploy takes ~3 minutes.

## Prerequisites
- Backend already deployed at `https://gnc-invoice-backend.onrender.com`
- GitHub account, this folder pushed to a repo

---

## Step 1 — Deploy frontend to Render

1. Push this folder (`app/`) to a GitHub repo.
2. In Render dashboard: **New +** → **Static Site**.
3. Connect the GitHub repo.
4. Configure:
   | Field | Value |
   |-------|-------|
   | **Name** | `gnc-invoice-frontend` |
   | **Branch** | `main` |
   | **Root Directory** | (leave blank, or `app` if repo has subfolder) |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |
5. Click **Create Static Site**.

Render builds once, then auto-deploys on every push to `main`.
Total build time: ~2 minutes.

## Step 2 — Update backend CORS (one-time)

WebSocket connections for the processing screen go directly to the backend
(not proxied), so the backend must allow your new frontend origin.

1. Open backend Render service dashboard.
2. Go to **Environment** tab.
3. Find `ALLOWED_ORIGINS` (add it if missing).
4. Set value:
   ```
   https://gnc-invoice-frontend.onrender.com,http://localhost:5173
   ```
   (Replace `gnc-invoice-frontend` with your actual frontend service name.)
5. Save — backend auto-restarts (~1 min).

## Step 3 — Verify

Open the deployed frontend URL:
1. Should see login page.
2. Log in with your admin account (`gnc@gmail.com` + password).
3. Dashboard shows current invoice count.
4. **Create New Invoice** → search a claim → processing screen streams
   progress. If WebSocket fails (silently), polling kicks in every 2s —
   you should still see the progress bar move.
5. Approve a draft through the multi-stage flow → Excel downloads.

---

## How it works

### API calls (HTTP)
The frontend's `public/_redirects` proxies `/api/*` to the backend:
```
/api/*  https://gnc-invoice-backend.onrender.com/api/:splat  200
```
This means:
- Frontend code uses `/api/...` (same-origin, no CORS)
- Render forwards each request to the backend transparently

### WebSocket (job progress)
Render Static Sites don't proxy WebSockets, so we connect directly:
```
wss://gnc-invoice-backend.onrender.com/api/jobs/{id}/ws
```
This requires backend CORS to allow the frontend origin (Step 2 above).

### Client-side routing
The `/* → /index.html` rule in `_redirects` means React Router works
even on hard refresh of `/invoices/review/xyz` etc.

---

## Changing the backend URL

If you rename the backend Render service, update **two files**:

1. **`public/_redirects`** — the HTTP API proxy
2. **`.env.production`** — the WebSocket direct connection

Then rebuild (Render auto-detects the push).

---

## Local development

```bash
npm install
npm run dev            # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`
(see `vite.config.js`). Adjust if your backend runs elsewhere.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login returns 401 | Check backend service is live at `/docs` |
| Login works, dashboard 404s | `_redirects` not deployed — check `public/_redirects` is in the repo |
| Processing screen stuck at 0% | Check backend `ALLOWED_ORIGINS` includes frontend URL |
| Excel download fails | Ensure backend `STORAGE_ROOT` and `.xlsx` file exist |
| React refresh shows blank page | `_redirects` fallback rule missing (`/* /index.html 200`) |
