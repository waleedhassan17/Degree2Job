"""Shared HTTP helpers: a configured async client with retries."""

import logging
import httpx

import config

logger = logging.getLogger("scraper.http")

DEFAULT_HEADERS = {
    "User-Agent": config.USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def make_client(**overrides) -> httpx.AsyncClient:
    """Create an AsyncClient with sane production defaults and transport retries."""
    headers = {**DEFAULT_HEADERS, **overrides.pop("headers", {})}
    return httpx.AsyncClient(
        timeout=httpx.Timeout(config.HTTP_TIMEOUT),
        headers=headers,
        follow_redirects=True,
        transport=httpx.AsyncHTTPTransport(retries=2),
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        **overrides,
    )


async def get_text(url: str, **kwargs) -> str | None:
    """GET a URL and return its text, or None on any non-200 / error."""
    try:
        async with make_client() as client:
            resp = await client.get(url, **kwargs)
        if resp.status_code != 200:
            logger.warning("GET %s -> %s", url, resp.status_code)
            return None
        return resp.text
    except Exception as exc:  # noqa: BLE001 - defensive by design
        logger.warning("GET %s failed: %s", url, exc)
        return None


async def get_json(url: str, **kwargs):
    """GET a URL and return parsed JSON, or None on any error."""
    try:
        async with make_client() as client:
            resp = await client.get(url, **kwargs)
        if resp.status_code != 200:
            logger.warning("GET %s -> %s", url, resp.status_code)
            return None
        return resp.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("GET(json) %s failed: %s", url, exc)
        return None
