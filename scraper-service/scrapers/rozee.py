"""Rozee.pk scraper.

Rozee discontinued its RSS feed and protects its search pages with a
JavaScript anti-bot challenge (responses contain `chlng` and no JSON-LD when
fetched with a plain HTTP client). We therefore:

  1. Try a fast httpx fetch and parse any JSON-LD JobPosting data.
  2. If that's blocked and ENABLE_PLAYWRIGHT=1, render the page in headless
     Chromium (which executes the challenge) and parse the result.
  3. Otherwise return [] so the rest of the aggregator is unaffected.
"""

import json
import logging
import re
from typing import Any, Dict, List

from bs4 import BeautifulSoup

import config
from cache import cached
from httpclient import get_text

logger = logging.getLogger("scraper.rozee")

BASE = "https://www.rozee.pk"


def _strip_html(html: str | None) -> str:
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", text).strip()


def _search_url(role: str) -> str:
    slug = re.sub(r"\s+", "-", role.strip().lower())
    return f"{BASE}/job/jsearch/q/{slug}"


def _parse_jsonld(html: str, city: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    postings: List[Dict[str, Any]] = []

    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = tag.string or tag.get_text() or ""
        try:
            parsed = json.loads(raw.strip())
        except (ValueError, TypeError):
            continue
        nodes = parsed if isinstance(parsed, list) else [parsed]
        for node in nodes:
            if not isinstance(node, dict):
                continue
            ntype = node.get("@type")
            is_job = (
                "JobPosting" in ntype if isinstance(ntype, list) else ntype == "JobPosting"
            )
            if not is_job:
                continue
            org = node.get("hiringOrganization")
            company = (
                org.get("name") if isinstance(org, dict) else (org or "Rozee Employer")
            )
            loc = city
            jl = node.get("jobLocation")
            if isinstance(jl, dict):
                addr = jl.get("address") or {}
                loc = addr.get("addressLocality") or addr.get("addressRegion") or city
            postings.append(
                {
                    "title": (node.get("title") or "Untitled Role").strip(),
                    "company": company or "Rozee Employer",
                    "location": loc or "Pakistan",
                    "apply_url": node.get("url") or BASE,
                    "description": _strip_html(node.get("description"))[:1500],
                    "source": "rozee",
                    "posted_at": node.get("datePosted"),
                }
            )
    return postings


async def _render_with_playwright(url: str) -> str | None:
    """Render the page in headless Chromium so the JS challenge resolves."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("ENABLE_PLAYWRIGHT set but playwright is not installed")
        return None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            page = await browser.new_page(user_agent=config.USER_AGENT)
            await page.goto(url, wait_until="networkidle", timeout=45000)
            html = await page.content()
            await browser.close()
            return html
    except Exception as exc:  # noqa: BLE001
        logger.warning("playwright render failed for %s: %s", url, exc)
        return None


async def _scrape(role: str, city: str) -> List[Dict[str, Any]]:
    url = _search_url(role)

    html = await get_text(url)
    jobs: List[Dict[str, Any]] = []
    if html and "JobPosting" in html:
        jobs = _parse_jsonld(html, city)

    if not jobs and config.ENABLE_PLAYWRIGHT:
        logger.info("rozee: httpx blocked, trying playwright")
        rendered = await _render_with_playwright(url)
        if rendered:
            jobs = _parse_jsonld(rendered, city)

    if not jobs:
        logger.info("rozee: no jobs (anti-bot challenge; enable Playwright to scrape)")

    return jobs[: config.MAX_ITEMS]


async def scrape_rozee(role: str, city: str) -> List[Dict[str, Any]]:
    key = f"rozee:{role.lower()}:{city.lower()}"
    return await cached(key, config.CACHE_TTL_DEFAULT, lambda: _scrape(role, city))
