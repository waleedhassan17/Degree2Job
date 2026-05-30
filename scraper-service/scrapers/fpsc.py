"""FPSC (Federal Public Service Commission) scraper.

The FPSC site is a Next.js app backed by a clean JSON API at /api/Jobs that
returns advertisement listings. Far more robust than scraping the SPA HTML.
"""

import logging
import re
from typing import Any, Dict, List

import config
from cache import cached
from httpclient import get_json

logger = logging.getLogger("scraper.fpsc")

API_URL = "https://www.fpsc.gov.pk/api/Jobs"
BASE = "https://www.fpsc.gov.pk"

CATEGORY_LABELS = {
    "GR": "General Recruitment",
    "CSS": "CSS Examination",
}


def _strip_html(html: str | None) -> str:
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", text).strip()


def _first_pdf(item: Dict[str, Any]) -> str | None:
    # Try the explicit pdfs list, then any link embedded in the description.
    pdfs = item.get("pdfs") or []
    if pdfs and isinstance(pdfs, list):
        path = pdfs[0].get("path") or pdfs[0].get("url") if isinstance(pdfs[0], dict) else None
        if path:
            return path if path.startswith("http") else BASE + path
    m = re.search(r'href="([^"]+\.pdf)"', item.get("description") or "", re.I)
    if m:
        path = m.group(1)
        return path if path.startswith("http") else BASE + path
    return None


async def _scrape() -> List[Dict[str, Any]]:
    data = await get_json(API_URL)
    if not data or not isinstance(data, dict):
        return []
    rows = data.get("data") or []

    jobs: List[Dict[str, Any]] = []
    for item in rows:
        title = (item.get("title") or "").strip()
        if not title:
            continue
        cat = item.get("category")
        label = CATEGORY_LABELS.get(cat, cat or "")
        jobs.append(
            {
                "title": f"{title} ({label})" if label else title,
                "organization": "Federal Public Service Commission (FPSC)",
                "location": "Islamabad, Pakistan",
                "apply_url": _first_pdf(item) or f"{BASE}/Jobs",
                "description": _strip_html(item.get("description"))[:1500],
                "source": "fpsc",
                "posted_at": item.get("date") or item.get("createdAt"),
            }
        )

    logger.info("fpsc: %d listings", len(jobs))
    return jobs[: config.MAX_ITEMS]


async def scrape_fpsc() -> List[Dict[str, Any]]:
    return await cached("fpsc", config.CACHE_TTL_GOVT, _scrape)
