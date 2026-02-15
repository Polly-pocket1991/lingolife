# Deploying LingoLife to Vercel

This project has a **Vite + React frontend** (deployed on Vercel) and an **Express backend** in `server/` (must be deployed elsewhere).

---

## 1. Deploy the backend first

The app in `server/` is a long-running Node/Express server. **Vercel does not run it.** Deploy the backend to one of:

- [Railway](https://railway.app)
- [Render](https://render.com)
- [Fly.io](https://fly.io)
- [Cyclic](https://www.cyclic.sh)

Then note your backend URL (e.g. `https://your-app.railway.app`).

**Backend environment variables** (set on the backend host, not Vercel):

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 5000; host often sets this) |
| `JWT_SECRET` | Yes | Secret for signing JWTs (use a long random string in production) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for admin operations) |
| `YOUDAO_APP_KEY` | No | Youdao dictionary API key (for translation) |
| `YOUDAO_APP_SECRET` | No | Youdao dictionary API secret |

---

## 2. Deploy the frontend to Vercel

1. Push your repo to GitHub/GitLab/Bitbucket and [import the project in Vercel](https://vercel.com/new).
2. Vercel will detect the Vite app from `vercel.json`. Use the **root** of the repo as the project root (do not set root to a subfolder).
3. Add the environment variables below in **Vercel → Project → Settings → Environment Variables**.

### Environment variables in Vercel

Set these for **Production** (and optionally Preview/Development if you use them).

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | **Yes** | Your backend URL from step 1 (e.g. `https://your-app.railway.app`). No trailing slash. |
| `GEMINI_API_KEY` | **Yes** (for AI) | Google Gemini API key. Used at **build time** by `vite.config.ts` for the frontend AI features. |

- **`VITE_API_BASE_URL`**  
  - Must be the full URL of your deployed backend.  
  - The frontend uses it for auth, words, and dictionary (Youdao proxy).  
  - Example: `https://lingolife-api.railway.app`

- **`GEMINI_API_KEY`**  
  - Injected at build time via Vite’s `define`.  
  - If you don’t set it, the build still succeeds but AI features that use Gemini may not work.

After adding variables, trigger a new deployment (Redeploy from the Vercel dashboard or push a new commit).

---

## 3. CORS

Your backend must allow requests from the Vercel frontend origin. In `server/server.js` you have `app.use(cors())`, which allows all origins. For production you can restrict:

```js
const allowedOrigins = [
  'https://your-app.vercel.app',
  'https://your-app-*.vercel.app'
];
app.use(cors({ origin: allowedOrigins }));
```

Replace with your real Vercel URL(s).

---

## 4. Quick checklist

- [ ] Backend deployed and reachable at a public URL.
- [ ] Backend env vars set (JWT_SECRET, Supabase, optional Youdao).
- [ ] `VITE_API_BASE_URL` in Vercel = backend URL (no trailing slash).
- [ ] `GEMINI_API_KEY` set in Vercel (for AI).
- [ ] Redeploy frontend after changing env vars (Vite bakes them at build time).
