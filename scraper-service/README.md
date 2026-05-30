# JobPulse PK — Scraper Service

A small FastAPI microservice that scrapes Mustakbil and Pakistani government
job portals (NTS, FPSC) that are awkward to fetch directly from the Next.js app.

## Endpoints

- `GET /health` — liveness check
- `GET /scrape/mustakbil?role=...&city=...` — Mustakbil listings
- `GET /scrape/govt` — combined NTS + FPSC listings

Each endpoint returns a JSON array and **never throws** — on any failure it
returns `[]` so the web app degrades gracefully.

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# visit http://localhost:8000/health
```

## Deploy to Railway

1. Push this folder to a Git repo (or the `scraper-service` subfolder of the main repo).
2. Create a new Railway project → Deploy from repo.
3. Railway auto-detects the `Dockerfile`. No env vars are required.
4. Copy the public URL Railway assigns and set it as `SCRAPER_SERVICE_URL`
   in the Next.js app's environment.

> Note: HTML scrapers are inherently brittle. Selectors here are intentionally
> broad. If a source changes its markup, update the corresponding file in
> `scrapers/` — the rest of the system keeps working without it.
