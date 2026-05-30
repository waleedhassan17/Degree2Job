"""NTS (National Testing Service) scraper.

NTS publishes test/recruitment announcements at /new/projectsnew.php. Each
listing is an `li.product` with a title+link in `.product-name a` and the
application deadline in `.price .amount`.
"""

import logging
import re
from typing import Any, Dict, List

from bs4 import BeautifulSoup

import config
from cache import cached
from httpclient import get_text

logger = logging.getLogger("scraper.nts")

URL = "https://www.nts.org.pk/new/projectsnew.php"
BASE = "https://www.nts.org.pk"


async def _scrape() -> List[Dict[str, Any]]:
    html = await get_text(URL)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    products = soup.select("li.product")

    jobs: List[Dict[str, Any]] = []
    for p in products:
        link_el = p.select_one(".product-name a")
        if not link_el:
            continue
        title = re.sub(r"\s+", " ", link_el.get_text(" ", strip=True)).strip()
        if not title:
            continue
        href = link_el.get("href", URL)
        if href.startswith("/"):
            href = BASE + href

        deadline_el = p.select_one(".price .amount")
        deadline = (
            re.sub(r"\s+", " ", deadline_el.get_text(" ", strip=True)) if deadline_el else ""
        )

        jobs.append(
            {
                "title": title[:160],
                "organization": "National Testing Service (NTS)",
                "location": "Pakistan",
                "apply_url": href,
                "description": deadline,
                "source": "nts",
                "posted_at": None,
            }
        )

    logger.info("nts: %d listings", len(jobs))
    return jobs[: config.MAX_ITEMS]


async def scrape_nts() -> List[Dict[str, Any]]:
    return await cached("nts", config.CACHE_TTL_GOVT, _scrape)
