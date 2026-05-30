"""
Degree2Job — Scraper microservice.

A small FastAPI app that scrapes sources the Next.js app can't easily reach:
Mustakbil (RSS), NTS and FPSC (government portals), and Rozee (best-effort,
behind an anti-bot challenge). Deployed separately (Railway/Render/Fly) and
pointed at via SCRAPER_SERVICE_URL in the web app.

Every endpoint is defensive: on any failure it returns an empty list rather
than erroring, so the aggregator in the web app degrades gracefully. Results
are cached in-memory to protect the upstream sources.
"""

import asyncio
import logging
from typing import Any, Dict, List

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import config
from scrapers.mustakbil import scrape_mustakbil
from scrapers.nts import scrape_nts
from scrapers.fpsc import scrape_fpsc
from scrapers.rozee import scrape_rozee

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("scraper")

app = FastAPI(title="Degree2Job Scraper", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


async def require_api_key(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> None:
    """Enforce the shared secret when API_KEY is configured; no-op otherwise."""
    if not config.API_KEY:
        return
    token = x_api_key
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if token != config.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@app.get("/")
@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "degree2job-scraper",
        "version": "2.0.0",
        "playwright": config.ENABLE_PLAYWRIGHT,
    }


@app.get("/scrape/mustakbil", dependencies=[Depends(require_api_key)])
async def mustakbil(
    role: str = Query("software engineer"),
    city: str = Query("Lahore"),
) -> List[Dict[str, Any]]:
    try:
        return await scrape_mustakbil(role, city)
    except Exception:  # noqa: BLE001
        logger.exception("mustakbil endpoint failed")
        return []


@app.get("/scrape/rozee", dependencies=[Depends(require_api_key)])
async def rozee(
    role: str = Query("software engineer"),
    city: str = Query("Lahore"),
) -> List[Dict[str, Any]]:
    try:
        return await scrape_rozee(role, city)
    except Exception:  # noqa: BLE001
        logger.exception("rozee endpoint failed")
        return []


@app.get("/scrape/govt", dependencies=[Depends(require_api_key)])
async def govt() -> List[Dict[str, Any]]:
    """Combined NTS + FPSC government listings, scraped concurrently."""
    results: List[Dict[str, Any]] = []
    nts_res, fpsc_res = await asyncio.gather(
        scrape_nts(), scrape_fpsc(), return_exceptions=True
    )
    for res in (nts_res, fpsc_res):
        if isinstance(res, list):
            results.extend(res)
        else:
            logger.warning("govt sub-scraper failed: %s", res)
    return results


@app.get("/scrape/all", dependencies=[Depends(require_api_key)])
async def scrape_all(
    role: str = Query("software engineer"),
    city: str = Query("Lahore"),
) -> Dict[str, List[Dict[str, Any]]]:
    """Convenience endpoint: every source in one call, run concurrently."""
    mk, rz, nts_res, fpsc_res = await asyncio.gather(
        scrape_mustakbil(role, city),
        scrape_rozee(role, city),
        scrape_nts(),
        scrape_fpsc(),
        return_exceptions=True,
    )

    def ok(x):
        return x if isinstance(x, list) else []

    return {
        "mustakbil": ok(mk),
        "rozee": ok(rz),
        "nts": ok(nts_res),
        "fpsc": ok(fpsc_res),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=False)
