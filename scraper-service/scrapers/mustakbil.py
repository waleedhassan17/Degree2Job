"""Mustakbil.com scraper — uses the official RSS feed (rss.mustakbil.com).

The feed carries ~500 recent listings with structured title/company/city/
category fields, which is far more reliable than scraping the HTML search
pages (those now 410 and sit behind redirects).
"""

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List

from bs4 import BeautifulSoup

import config
from cache import cached
from httpclient import get_text

logger = logging.getLogger("scraper.mustakbil")

RSS_URL = "https://rss.mustakbil.com/jobs-rss"


def _strip_html(html: str | None) -> str:
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", text).strip()


def _text(item, name: str) -> str | None:
    el = item.find(name)
    return el.get_text(strip=True) if el else None


def _to_iso(pub: str | None) -> str | None:
    if not pub:
        return None
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S"):
        try:
            return datetime.strptime(pub.strip(), fmt).astimezone(timezone.utc).isoformat()
        except ValueError:
            continue
    return None


async def _scrape(role: str, city: str) -> List[Dict[str, Any]]:
    xml = await get_text(RSS_URL)
    if not xml:
        return []

    soup = BeautifulSoup(xml, "xml")
    items = soup.find_all("item")

    role_tokens = [t for t in role.lower().split() if len(t) > 2]
    city_lc = (city or "").lower()

    scored: List[tuple[int, Dict[str, Any]]] = []
    for it in items:
        title = _text(it, "title")
        if not title:
            continue
        link = _text(it, "link") or _text(it, "guid") or "https://www.mustakbil.com/jobs"
        company = _text(it, "company") or "Mustakbil Employer"
        job_city = _text(it, "city") or city or "Pakistan"
        category = _text(it, "category")
        desc = _strip_html(_text(it, "description"))
        # RSS uses a lowercase <pubdate> tag.
        posted = _to_iso(_text(it, "pubDate") or _text(it, "pubdate"))

        hay = f"{title} {category or ''} {desc}".lower()
        rank = 0
        if role_tokens and any(tok in hay for tok in role_tokens):
            rank += 2
        if city_lc and city_lc in job_city.lower():
            rank += 1

        scored.append(
            (
                rank,
                {
                    "title": title,
                    "company": company,
                    "location": f"{job_city}, Pakistan" if job_city else "Pakistan",
                    "apply_url": link,
                    "description": desc[:1500],
                    "category": category,
                    "posted_at": posted,
                },
            )
        )

    # Most-relevant first, capped.
    scored.sort(key=lambda x: x[0], reverse=True)
    jobs = [j for _, j in scored][: config.MAX_ITEMS]
    logger.info("mustakbil: %d items -> %d returned", len(items), len(jobs))
    return jobs


async def scrape_mustakbil(role: str, city: str) -> List[Dict[str, Any]]:
    key = f"mustakbil:{role.lower()}:{city.lower()}"
    return await cached(key, config.CACHE_TTL_DEFAULT, lambda: _scrape(role, city))
