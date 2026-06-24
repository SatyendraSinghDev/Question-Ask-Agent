# 🎓 TestASK AI

### Intelligent AI-Powered Question Bank & Assessment Platform

<p align="center">
  <img src="brand/logo.svg" alt="TestASK AI" width="280"/>
</p>

TestASK **AI** is an enterprise-grade online examination system for GATE, UPSC, SSC, Banking,
CAT, NEET, JEE and government exam preparation. It combines an AI question-generation engine
with a full assessment test engine, bilingual (Hindi + English) support, anti-cheat
proctoring, deep analytics, and verifiable PDF certificates.

---

## ✨ Highlights

| Capability | Description |
|---|---|
| 🌐 **Bilingual** | Hindi, English, and side-by-side Hindi + English questions |
| 🤖 **AI Engine** | Text→Q, Image→Q (OCR), PDF→Q, difficulty detection, translation, dedup, subjective grading |
| 🧪 **Test Engine** | Test-level & per-question timers, pause/resume, auto-submit, fullscreen + tab-switch proctoring |
| 📊 **Analytics** | Subject/topic/difficulty breakdowns with Chart.js (pie, bar, trend) |
| 🏅 **Certificates** | Downloadable PDF with QR verification + unique certificate ID |
| 👥 **RBAC** | Super Admin · Admin · Examiner · Student |
| 🧩 **13 Question Types** | MCQ (single/multi), T/F, fill-blank, numerical, match, assertion-reason, paragraph, coding, subjective, audio/image/video |
| 🐳 **One-command deploy** | Docker Compose + Nginx + CI/CD-ready |

---

## 🏗️ Monorepo Structure

```
Question-Ask-Agent/
├── brand/                  # Logo, favicon (SVG)
├── client/                 # React 18 + TS + Vite + Tailwind + RTK Query
│   ├── public/             # favicon + manifest
│   └── src/
│       ├── app/            # store, RTK Query API, router
│       ├── components/     # reusable UI (logo, charts, layout shell)
│       ├── features/       # auth, dashboard, questions, tests, results, certificates
│       └── lib/            # axios, hooks, guards, utils
├── server/                 # Node + Express + TS + MongoDB + JWT
│   ├── src/
│   │   ├── config/         # env, db, cloud
│   │   ├── models/         # Mongoose schemas
│   │   ├── controllers/    # request handlers
│   │   ├── services/       # business logic + AI/OpenAI service
│   │   ├── routes/         # express routers
│   │   ├── middleware/     # auth, RBAC, error, upload, rateLimit
│   │   ├── utils/          # jwt, email, logger, apiResponse
│   │   └── types/          # shared TS types/enums
│   └── uploads/            # Multer uploads (gitignored)
├── nginx/                  # reverse proxy config
├── docker-compose.yml      # mongo + backend + frontend
└── DEPLOYMENT.md           # production deployment guide
```

## 🚀 Quick Start (local dev)

```bash
# 1. Install everything
npm install

# 2. Configure environment
cp server/.env.example   server/.env
cp client/.env.example   client/.env

# 3. Start MongoDB (local OR docker)
docker compose up -d mongo

# 4. Seed an admin + sample data
npm run seed -w server

# 5. Run both apps concurrently
npm run dev
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:5000/api/v1
- API docs (Swagger-ish JSON) → http://localhost:5000/api/v1/health

### Default seeded admin
```
email:    admin@testask.ai
password: Admin@123
```

## 🐳 One-command Docker deploy

```bash
docker compose up --build
```

## 🧪 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run server + client concurrently |
| `npm run build` | Type-check + build both apps |
| `npm run typecheck` | Strict TS check across workspaces |
| `npm run lint` | ESLint both workspaces |
| `npm run docker:up` | Full stack in Docker |

## 🔐 Environment Variables

See [`server/.env.example`](server/.env.example) and [`client/.env.example`](client/.env.example).

Key variables:

- `MONGODB_URI`, `PORT`, `NODE_ENV`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- `CORS_ORIGIN`
- `VITE_API_BASE_URL`

## 🚀 Deployment

### Local

1. Copy env examples:
   - `cp server/.env.example server/.env`
   - `cp client/.env.example client/.env`
2. Set `VITE_API_BASE_URL=http://localhost:5000/api/v1` in `client/.env`
3. Start MongoDB and the app:
   - `docker compose up -d mongo`
   - `npm run dev`

### Vercel (frontend)

- Add this repository to Vercel.
- Use the root `vercel.json` config.
- In Vercel dashboard, set `VITE_API_BASE_URL` to your backend API URL, for example:
  - `https://api.yourdomain.com/api/v1`
- The frontend will be served from Vercel and will call your backend API with that URL.

### Backend hosting

This repository uses an Express + MongoDB backend that is not directly deployed as a Vercel static site.
You can host the backend on a server or platform like Render, Railway, Fly.io, AWS, DigitalOcean, or a VPS.

Recommended backend flow:

- Deploy the backend from the `server/` folder.
- Set backend environment variables on the host.
- Set `CORS_ORIGIN` to your frontend domain.
- Set `VITE_API_BASE_URL` in Vercel to point to the backend API.

### GitHub Actions

- A workflow is available at `.github/workflows/deploy.yml`.
- It builds the monorepo and deploys the frontend to Vercel using your Vercel secrets:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

## 📄 License

MIT © TestASK AI
