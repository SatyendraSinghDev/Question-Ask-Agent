# 🚀 TestASK AI — Production Deployment Guide

Deploy **frontend → Vercel**, **backend → Render**, **database → MongoDB Atlas** (all free tiers).
Both local and production run from the **same codebase** — only environment variables differ.

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Vercel    │ ───▶ │    Render     │ ───▶ │  MongoDB Atlas  │
│  (frontend) │ API  │  (backend)   │ Mongo │   (database)    │
│  React SPA  │      │  Express API │       │   Free M0 tier  │
└─────────────┘      └──────────────┘      └─────────────────┘
```

**Total cost: $0** · **Total time: ~25 minutes**

---

## 📋 Prerequisites checklist

- [ ] GitHub account (you have: `SatyendraSinghDev`)
- [ ] Google account (for MongoDB Atlas + your Gemini key)
- [ ] Render account — sign up at https://render.com **using GitHub**
- [ ] Vercel account — sign up at https://vercel.com **using GitHub**
- [ ] Your Gemini API key (`AIzaSy...`)

---

## STEP 1 — Push code to GitHub (5 min)

This makes the code available to Render & Vercel.

```bash
cd "C:\Users\Satyendra Singh\Downloads\Question-Ask-Agent"

git init
git branch -M main
git add .
git commit -m "feat: TestASK AI — full-stack assessment platform"

git remote add origin https://github.com/SatyendraSinghDev/Question-Ask-Agent.git
git push -u origin main
```

> If the remote repo already has content, use `git push -u origin main --force` once.

---

## STEP 2 — Create MongoDB Atlas database (5 min)

Atlas hosts your MongoDB in the cloud (free M0 tier — 512MB, plenty for dev).

1. Go to **https://www.mongodb.com/cloud/atlas/register** → sign up with Google
2. Create a project → name it `testask`
3. **Build a Database** → choose **M0 Free** → pick a region (e.g. AWS Mumbai `ap-south-1`) → **Create**
4. Wait ~3 min for the cluster to provision
5. **Database Access** (left sidebar) → **Add New Database User**:
   - Username: `testask`
   - Password: click **Autogenerate** → **copy & save this password** 🔑
   - Role: **Read and write to any database**
   - → **Add User**
6. **Network Access** (left sidebar) → **Add IP Address** → **Allow Access From Anywhere** (`0.0.0.0/0`) → **Confirm**
7. **Database** (left sidebar) → **Connect** → **Drivers** → **Node.js** → copy the connection string:
   ```
   mongodb+srv://testask:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. **Replace `<password>` with the password you saved in step 5.**

This string is your **`MONGODB_URI`** — keep it for Step 3.

---

## STEP 3 — Deploy backend to Render (8 min)

Render runs the Express server as a persistent web service (no 10s timeout → AI generation works).

1. Go to **https://dashboard.render.com** → sign in with **GitHub**
2. **New +** → **Blueprint**
3. Select your repo: **`SatyendraSinghDev/Question-Ask-Agent`**
4. Render reads `render.yaml` → creates a service `testask-api` → **Apply**
5. Open the service → **Environment** tab → add these secrets:

| Key | Value |
|---|---|
| `MONGODB_URI` | *(from Step 2 — your Atlas connection string)* |
| `JWT_SECRET` | random hex: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | a DIFFERENT random hex |
| `CORS_ORIGIN` | `https://question-ask-agent.vercel.app` *(update after Step 5)* |
| `APP_URL` | `https://question-ask-agent.vercel.app` |
| `AI_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | your Gemini key `AIzaSy...` |
| `GEMINI_MODEL` | `gemini-2.5-flash` |

6. **Manual Deploy** → **Deploy latest commit**
7. When done (~3 min) you get: `https://testask-api.onrender.com`
8. **Test:** visit `https://testask-api.onrender.com/api/v1/health` → should return `{"status":"ok"}`

> ⚠️ Render free tier "sleeps" after 15 min idle. First request after sleep takes ~30s to wake.

---

## STEP 4 — Deploy frontend to Vercel (5 min)

1. Go to **https://vercel.com** → sign in with **GitHub**
2. **Add New** → **Project** → **Import** repo `SatyendraSinghDev/Question-Ask-Agent`
3. Verify auto-detected settings (from `client/vercel.json`):
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables** → add:

   | Name | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://testask-api.onrender.com/api/v1` *(your Render URL)* |
   | `VITE_APP_NAME` | `TestASK AI` |

5. **Deploy** → wait ~1 min
6. You get: **`https://question-ask-agent.vercel.app`** 🎉

---

## STEP 5 — Connect the two (CORS)

1. Copy your **Vercel URL** (`https://question-ask-agent-xxxx.vercel.app`)
2. In **Render** → `testask-api` → **Environment** → update:
   - `CORS_ORIGIN` = exact Vercel URL
   - `APP_URL` = exact Vercel URL
3. **Manual Deploy** to apply

---

## STEP 6 — Seed production database (optional)

Create admin + sample test in Atlas by running the seed script against production:

```bash
# server/.env: temporarily set MONGODB_URI to your Atlas string
cd server && npm run seed
# then restore MONGODB_URI to localhost for local dev
```

**Admin:** `admin@testask.ai` / `Admin@123` — **change the password in production!**

---

## ✅ Verification checklist

- [ ] `https://testask-api.onrender.com/api/v1/health` → `{"status":"ok"}`
- [ ] `https://question-ask-agent.vercel.app` loads
- [ ] Register a student → works
- [ ] Login → dashboard loads
- [ ] AI Generate → `● AI online · gemini · gemini-2.5-flash`
- [ ] Generate questions → real questions appear

---

## 🔧 Local vs Production — same codebase

| Concern | Local | Production |
|---|---|---|
| Frontend API URL | `client/.env` → `http://localhost:5000/api/v1` | Vercel env var → `https://testask-api.onrender.com/api/v1` |
| Database | `server/.env` → `mongodb://127.0.0.1:27017/testask` | Render env var → Atlas `mongodb+srv://...` |
| JWT secrets | dev strings in `server/.env` | random 48-byte hex in Render |
| AI | `server/.env` → Gemini key | Render env var → Gemini key |

**Nothing in the code changes between environments** — only env vars.

---

## 🆘 Troubleshooting

| Symptom | Fix |
|---|---|
| Login fails with CORS error | `CORS_ORIGIN` in Render must exactly match Vercel URL (no trailing slash) |
| `503 AI_REQUEST_FAILED` | Gemini temporarily overloaded — app auto-falls-back to alternate models; retry in 30s |
| Render slow / "sleeping" | Free tier spins down after 15 min idle. Ping `/api/v1/health` every 10 min via UptimeRobot, or upgrade to Starter ($7/mo) |
| Atlas connection timeout | Ensure `0.0.0.0/0` is in Network Access; URL-encode special chars in password |
| `MONGODB_URI` refused | Replace `<password>` placeholder with the real password |

---

## 🔄 Continuous deployment

Every `git push` to `main` automatically rebuilds both Render (backend) and Vercel (frontend). No manual steps for future updates.
