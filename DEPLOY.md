# Deploying Refundly (PWA) to Vercel

This is a static Vite + React SPA. Vercel builds it with `npm run build` and serves
the `dist/` folder. There is no server runtime — the app talks to Supabase directly.

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production,
Preview, and Development as needed). They're inlined at build time, so a change
requires a redeploy.

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | e.g. `https://csrilognqcsdkmstuqva.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon/publishable key — safe for the browser (protected by RLS) |
| `VITE_DEFAULT_TIMEZONE` | ⬜ | Default timezone for new profiles. Defaults to `Asia/Kolkata` |
| `VITE_ANDROID_APK_URL` | ⬜ | External APK URL for the "Get the app" card |
| `VITE_ANDROID_APP_VERSION` | ⬜ | Version label next to the download button |
| `VITE_VAPID_PUBLIC_KEY` | ⬜ | VAPID **public** key for web push (private key stays in Supabase) |

> ⚠️ **Never** add `SUPABASE_ACCESS_TOKEN`, the service_role key, or `API_NINJAS`
> to Vercel. They are server-side secrets, are not `VITE_`-prefixed (so they are
> never bundled), and the web app does not need them.

## 2. Deploy

### Option A — Git (recommended)
1. `git init && git add -A && git commit -m "Initial commit"` (this folder isn't a repo yet)
2. Push to GitHub/GitLab/Bitbucket.
3. In Vercel, **New Project → Import** the repo. The **Root Directory** must be
   this `Refund-Reminder/` folder (not the parent). Vercel auto-detects Vite.
4. Add the env vars from step 1, then **Deploy**.

### Option B — Vercel CLI (no git required)
```bash
npm i -g vercel
cd Refund-Reminder
vercel            # first run links/creates the project
vercel --prod     # production deploy
```
Add the env vars via the dashboard or `vercel env add`.

## 3. After the first deploy — point Supabase at the domain

Auth email links (sign-up confirmation, magic link) redirect back to the app's
origin, so add your Vercel URL in **Supabase → Authentication → URL Configuration**:
- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs**: add `https://<your-app>.vercel.app/**` (and any custom domain)

Password reset is code-based (no redirect needed), but confirmation/magic-link
sign-in will fail until the domain is allowlisted here.

## What's already configured

- `vercel.json` — SPA rewrites (deep links like `/app/orders/:id` serve `index.html`),
  no-cache headers for the service worker (`sw.js` / `registerSW.js`) so PWA updates
  ship immediately, and long immutable caching for hashed `/assets/*`.
- `engines.node` / `.nvmrc` — pins Node 22.
- `npm run build` runs `tsc -b && vite build` and emits `dist/` + the PWA service worker.
