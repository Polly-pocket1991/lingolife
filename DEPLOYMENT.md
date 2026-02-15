# Deploy LingoLife: Frontend + Backend + Supabase

This guide walks through deploying the full stack: **Supabase** (database), **Backend** (Express API), and **Frontend** (Vite/React on Vercel).

---

## Overview

| Part      | Where it runs        | Purpose                          |
|-----------|----------------------|-----------------------------------|
| Supabase  | supabase.com (hosted)| PostgreSQL DB + `users` & `words` |
| Backend   | Railway or Render    | Express API (auth, words, Youdao) |
| Frontend  | Vercel               | React SPA                         |

**Order:** Set up Supabase first → Deploy backend → Deploy frontend.

---

## 1. Supabase (database)

### 1.1 Create a project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name (e.g. `lingolife`), database password, region → **Create**.

### 1.2 Get API keys

1. In the project: **Project Settings** (gear) → **API**.
2. Copy and save:
   - **Project URL** (e.g. `https://xxxx.supabase.co`) → use as `SUPABASE_URL`.
   - **anon public** key → use as `SUPABASE_ANON_KEY`.

### 1.3 Create tables

1. In the dashboard: **SQL Editor** → **New query**.
2. Run the following in **two steps**.

**Step A – Users table**

Paste and run `server/create_users_table.sql` (or the SQL below):

```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**Step B – Words table**

Paste and run (creates table + trigger; no sample rows):

```sql
CREATE TABLE IF NOT EXISTS words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    term TEXT NOT NULL,
    phonetic TEXT,
    translation TEXT NOT NULL,
    part_of_speech TEXT,
    definition TEXT,
    known_count INTEGER DEFAULT 0,
    unknown_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reviewed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_words_user_id ON words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_created_at ON words(created_at);
ALTER TABLE words DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_words_updated_at
    BEFORE UPDATE ON words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Step C – Allow backend to use the DB**

Your backend uses the **anon** key. We disabled RLS above so the backend can read/write. If you already created `words` with RLS enabled, run:

```sql
ALTER TABLE words DISABLE ROW LEVEL SECURITY;
```

Supabase is ready. Use **Project URL** and **anon public** in the backend env next.

---

## 2. Backend (Express API)

The backend lives in the `server/` folder. Deploy it to **Railway** or **Render**.

### Option A – Railway

1. Go to [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. **New Project** → **Deploy from GitHub repo** → select your repo.
3. **Add service** → choose the same repo.
4. **Settings** for that service:
   - **Root Directory:** `server`
   - **Build Command:** `npm install` (or leave default)
   - **Start Command:** `npm start` or `node server.js`
5. **Variables** (Settings → Variables): add

   | Name                   | Value                          |
   |------------------------|---------------------------------|
   | `PORT`                 | `5000` (or leave unset; Railway sets it) |
   | `JWT_SECRET`           | Long random string (e.g. from [randomkeygen](https://randomkeygen.com)) |
   | `SUPABASE_URL`         | Your Supabase **Project URL**   |
   | `SUPABASE_ANON_KEY`    | Supabase **anon public** key    |
   | `YOUDAO_APP_KEY`       | (optional) Youdao key           |
   | `YOUDAO_APP_SECRET`    | (optional) Youdao secret        |

6. **Deploy** → when it’s live, open **Settings** → **Networking** → **Generate domain**. Copy the URL (e.g. `https://lingolife-server-production.up.railway.app`). This is your **backend URL** for the frontend.

### Option B – Render

1. Go to [render.com](https://render.com) and sign in.
2. **New** → **Web Service** → connect your repo.
3. **Settings:**
   - **Root Directory:** `server`
   - **Build:** `npm install`
   - **Start:** `npm start` or `node server.js`
   - **Plan:** Free or paid.
4. **Environment**: add the same variables as in the Railway table above.
5. **Create Web Service** → wait for deploy. Your backend URL is like `https://your-service-name.onrender.com`.

### CORS (after frontend is deployed)

Once the frontend is on Vercel, you can restrict CORS. In `server/server.js` replace `app.use(cors());` with (use your real Vercel URL):

```js
const allowedOrigins = [
  'https://your-app.vercel.app',
  'https://your-app-*.vercel.app',
  'http://localhost:3000'
];
app.use(cors({ origin: allowedOrigins }));
```

Redeploy the backend after changing code.

---

## 3. Frontend (Vercel)

1. Push your code to **GitHub** (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo.
3. Leave **Root Directory** as the repo root (so Vercel uses `vercel.json` and builds the Vite app).
4. **Environment Variables** (before or after first deploy):

   | Name                | Value                                      | Env      |
   |---------------------|--------------------------------------------|----------|
   | `VITE_API_BASE_URL`| Your **backend URL** (no trailing slash)    | Production (and Preview if you want) |
   | `GEMINI_API_KEY`   | Your Gemini API key (if you use AI features)| Production |

   Example: `VITE_API_BASE_URL` = `https://lingolife-server-production.up.railway.app`

5. **Deploy**. Vercel will run `npm run build` and serve the app from the `dist` folder.
6. After the first deploy, if you add or change env vars, use **Redeploy** so the new values are baked in.

---

## 4. Checklist

- [ ] **Supabase:** Project created; `users` and `words` tables created; RLS disabled on both; Project URL + anon key saved.
- [ ] **Backend:** Deployed (Railway or Render); root = `server`; `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` set; public URL copied.
- [ ] **Frontend:** Deployed on Vercel; `VITE_API_BASE_URL` = backend URL; `GEMINI_API_KEY` set if needed; redeployed after env changes.
- [ ] **CORS:** Backend allows your Vercel origin (optional but recommended for production).

---

## 5. Quick reference – env vars

**Supabase (dashboard)**  
- No env vars; you only run SQL and copy URL + anon key into the backend.

**Backend (Railway/Render)**  
- `PORT` – often set by host  
- `JWT_SECRET` – required  
- `SUPABASE_URL` – required  
- `SUPABASE_ANON_KEY` – required  
- `YOUDAO_APP_KEY` / `YOUDAO_APP_SECRET` – optional  

**Frontend (Vercel)**  
- `VITE_API_BASE_URL` – backend URL (required)  
- `GEMINI_API_KEY` – optional (for AI)

After this, your app is fully deployed: frontend on Vercel, backend on Railway/Render, database on Supabase.
