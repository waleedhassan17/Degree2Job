# Degree2Job — Scraper Service

A small, production-ready FastAPI microservice that scrapes Pakistani job
sources the Next.js app can't reach directly:

| Source | Method | Notes |
|--------|--------|-------|
| **Mustakbil** | Official RSS feed | ~500 listings, structured, reliable |
| **NTS** | HTML (`projectsnew.php`) | Government test/recruitment announcements |
| **FPSC** | JSON API (`/api/Jobs`) | Federal recruitment advertisements |
| **Rozee** | Best-effort + optional headless browser | Behind an anti-bot challenge |

Every endpoint **never throws** — on failure it returns `[]` so the web app
degrades gracefully. Results are cached in memory to protect the sources.

## Endpoints

- `GET /health` — liveness check
- `GET /scrape/mustakbil?role=...&city=...`
- `GET /scrape/govt` — combined NTS + FPSC (run concurrently)
- `GET /scrape/rozee?role=...&city=...`
- `GET /scrape/all?role=...&city=...` — every source in one call

If `API_KEY` is set, every `/scrape/*` request must send
`Authorization: Bearer <API_KEY>` (the Next.js app does this via
`SCRAPER_API_KEY`).

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `8000` | Provided by the platform |
| `API_KEY` | _(empty)_ | Shared secret; when set, auth is enforced |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `CACHE_TTL_DEFAULT` | `1800` | Cache TTL for Mustakbil/Rozee (sec) |
| `CACHE_TTL_GOVT` | `3600` | Cache TTL for NTS/FPSC (sec) |
| `MAX_ITEMS` | `50` | Max items per source |
| `ENABLE_PLAYWRIGHT` | `false` | Use headless Chromium for Rozee |
| `LOG_LEVEL` | `INFO` | Logging level |

## Run locally

```bash
cd scraper-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# http://localhost:8000/health
```

## Deploy

The service lives in the `scraper-service/` subdirectory of the repo, so set
the **root directory** to `scraper-service` on your platform.

### Render (recommended — has a free tier, GitHub-native)

A `render.yaml` blueprint is included at the repo root.

1. Push the repo to GitHub.
2. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** →
   pick the `Degree2Job` repo. Render reads `render.yaml`, builds the Docker
   image from `scraper-service/`, and generates a random `API_KEY`.
3. After deploy, open the service → **Environment** → copy the `API_KEY` value
   and note the public URL, e.g. `https://degree2job-scraper.onrender.com`.
4. Set these in the Next.js app's env (locally in `.env.local`, and in Vercel
   project settings for production):
   ```
   SCRAPER_SERVICE_URL=https://degree2job-scraper.onrender.com
   SCRAPER_API_KEY=<the API_KEY value from Render>
   ```
5. Verify: `curl https://degree2job-scraper.onrender.com/health`

> Render free instances sleep after inactivity; the first request after idle
> takes a few seconds to wake. Scraped results are cached, so subsequent
> requests are fast.

### Railway

`railway.json` is included (Dockerfile builder).

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
2. In service settings, set **Root Directory** to `scraper-service`.
3. Add env var `API_KEY` (any random string). Railway sets `PORT` automatically.
4. Copy the generated public domain and wire it into the Next.js env as above.

### Fly.io / Docker anywhere

```bash
cd scraper-service
docker build -t degree2job-scraper .
docker run -p 8000:8000 -e API_KEY=secret degree2job-scraper
```

## Enabling Rozee (optional, heavier)

Rozee blocks plain HTTP scrapers with a JavaScript challenge. To scrape it you
need the headless-browser image:

- Build with `Dockerfile.playwright` instead of `Dockerfile`.
- Set `ENABLE_PLAYWRIGHT=1`.
- Allocate ~1GB RAM (above most free tiers).

Without this, `/scrape/rozee` returns `[]` and the rest of the service is
unaffected. (The Next.js app also has its own Rozee scraper, so you may not
need this path at all.)

> HTML scrapers are inherently brittle. If a source changes its markup, update
> the matching file in `scrapers/` — the rest of the system keeps working.
