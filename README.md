# JobPulse PK ⚡

**AI-matched jobs for Pakistani university students.** Upload your resume once,
and JobPulse aggregates listings from Rozee.pk, Mustakbil, government portals
(NTS/FPSC) and international boards — then uses Claude to score every job for fit,
explain why you match, and generate tailored cover letters.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Anthropic Claude · Supabase**.

---

## ✨ Features

- **One ranked feed** across multiple Pakistani + international job sources
- **AI match scoring (0–100)** with reasons and skill-gap analysis per role
- **Resume parsing** from PDF/DOCX via Claude — no manual forms
- **Streaming AI cover letters** tailored to each job and the local market
- **Application tracker** — a drag-and-drop Kanban (saved → applied → interview → offer)
- **Graceful degradation** — the app boots with just an Anthropic key + Supabase;
  every other integration is optional and disables cleanly if its keys are absent

---

## 🏗 Architecture

```
Next.js app (Vercel)
 ├─ /api/resume/upload   → extract text (pdf-parse / mammoth), optional Blob storage
 ├─ /api/resume/parse    → Claude parses resume → ParsedProfile
 ├─ /api/jobs/fetch      → aggregates sources (Promise.allSettled), dedupes, caches
 ├─ /api/jobs/match      → Claude scores jobs in batches of 5 (heuristic fallback)
 ├─ /api/cover-letter    → streams a Claude-written cover letter
 └─ /api/saved           → CRUD for the application tracker (Supabase)

Python scraper service (Railway)  ← optional
 ├─ /scrape/mustakbil
 └─ /scrape/govt  (NTS + FPSC)

Supabase  → resumes, jobs, job_matches, saved_jobs
Upstash Redis  → 2h source cache (optional)
```

Job sources and how they're reached:

| Source | How | Required env |
|---|---|---|
| Rozee.pk | RSS feed (direct) | none |
| International (JSearch) | RapidAPI | `RAPIDAPI_KEY` (optional) |
| Mustakbil | Python scraper service | `SCRAPER_SERVICE_URL` (optional) |
| NTS / FPSC | Python scraper service | `SCRAPER_SERVICE_URL` (optional) |

---

## 🚀 Quick start (local)

**Prerequisites:** Node.js 18.18+ (Node 20/22 recommended), an Anthropic API key,
and a free Supabase project.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
#   → fill in ANTHROPIC_API_KEY and the two NEXT_PUBLIC_SUPABASE_* values
#   → SUPABASE_SERVICE_ROLE_KEY is recommended for writes

# 3. Create the database schema
#   Open Supabase → SQL Editor → paste supabase/migrations/001_initial.sql → Run
#   Then paste supabase/deploy_anonymous_identity.sql → Run

# 4. Run
npm run dev
#   → http://localhost:3000
```

The minimum to boot: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without the others, you'll still get Rozee jobs,
AI matching, and cover letters; other sources simply show as "unavailable".

---

## 🔑 Environment variables

See `.env.example` for the annotated list. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Resume parsing, matching, cover letters |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Database |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Database (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ▲ | Server-side writes (recommended) |
| `BLOB_READ_WRITE_TOKEN` | ◻ | Persist uploaded resume files |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | ◻ | Cache job sources (2h) |
| `RAPIDAPI_KEY` | ◻ | JSearch international listings |
| `SCRAPER_SERVICE_URL` | ◻ | Mustakbil + NTS/FPSC |

✅ required · ▲ recommended · ◻ optional (degrades gracefully)

---

## 📦 Deploy

### Web app → Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** the repo.
3. Add the environment variables above in **Project Settings → Environment Variables**.
4. Deploy. Vercel auto-detects Next.js — no extra config needed.

> Tip: set `NEXT_PUBLIC_APP_URL` to your Vercel URL for correct OpenGraph metadata.

### Scraper service → Railway (optional)

The `scraper-service/` folder is a standalone FastAPI app. See its own
`README.md`. In short: deploy the folder to Railway (it auto-detects the
Dockerfile), then set the resulting URL as `SCRAPER_SERVICE_URL` in Vercel.

### Database → Supabase

Run `supabase/migrations/001_initial.sql` once in the SQL editor. It creates the
`resumes`, `jobs`, `job_matches`, and `saved_jobs` tables with indexes and RLS.

Then run `supabase/deploy_anonymous_identity.sql`. It adds the anonymous user
table, links resumes and saved jobs to per-user records, and sets the unique
constraint needed for user-scoped saved jobs.

If you have a `DATABASE_URL`, you can also run the same migration locally with:

```bash
DATABASE_URL='postgresql://...' npm run deploy:anonymous-identity
```

---

## 📂 Project structure

```
app/
  (marketing)/        landing page
  (app)/              upload · jobs · jobs/[id] · dashboard · profile
  api/                resume, jobs, cover-letter, saved route handlers
components/
  ui/                 shadcn-style primitives
  layout/             navbar, footer, sidebar
  resume/             dropzone, profile card, skill badges
  jobs/               job card, grid, filters, detail sheet, match breakdown
  cover-letter/       streaming modal
  dashboard/          kanban tracker
hooks/                useResume, useJobs, useJobMatch, useSavedJobs
lib/                  types, anthropic, supabase, redis, matching, scrapers
store/                zustand global state (persisted)
supabase/migrations/  SQL schema
scraper-service/      Python FastAPI microservice
```

---

## 🧪 Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## 📝 Notes & limitations

- **Scrapers are brittle by nature.** The Rozee RSS feed and the Python HTML
  scrapers use broad selectors; if a source changes its markup, that one source
  may return fewer/no results while everything else keeps working.
- **Anonymous sessions.** The app uses a localStorage session id rather than
  accounts. Saved jobs are keyed to that id. Add Supabase Auth if you want
  cross-device sync.
- **Costs.** Matching calls Claude per job (batched). For large feeds, the local
  heuristic pre-score keeps the UI useful while AI scores stream in.

---

Built for students who are tired of refreshing five job boards a day.
# Degree2Job
