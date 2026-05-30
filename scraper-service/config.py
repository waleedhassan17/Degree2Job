"""Runtime configuration, sourced from environment variables."""

import os


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


# Network port (provided by the platform on Railway/Render).
PORT: int = _int("PORT", 8000)

# Optional shared secret. When set, every /scrape/* request must send
# `Authorization: Bearer <API_KEY>` (or `x-api-key: <API_KEY>`). The Next.js
# app sends this via SCRAPER_API_KEY. Leave empty to keep the service open.
API_KEY: str = os.environ.get("API_KEY", "").strip()

# Comma-separated allowed CORS origins. "*" allows all (fine for a public,
# read-only scraper). Set to your site origin in production if you prefer.
CORS_ORIGINS: list[str] = [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()
]

# In-memory cache TTLs (seconds). Scraped pages change slowly; caching protects
# the upstream sources and keeps the service fast.
CACHE_TTL_DEFAULT: int = _int("CACHE_TTL_DEFAULT", 1800)  # 30 min
CACHE_TTL_GOVT: int = _int("CACHE_TTL_GOVT", 3600)  # 1 hour

# Per-source HTTP timeout (seconds).
HTTP_TIMEOUT: float = float(os.environ.get("HTTP_TIMEOUT", "20"))

# Max items returned per source.
MAX_ITEMS: int = _int("MAX_ITEMS", 50)

# Enable the Playwright (headless Chromium) path for anti-bot sources like
# Rozee. Off by default because it requires the heavier Dockerfile.playwright
# image. When off, Rozee falls back to a best-effort httpx attempt.
ENABLE_PLAYWRIGHT: bool = _bool("ENABLE_PLAYWRIGHT", False)

LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO").upper()

# A realistic desktop browser UA — many PK job sites reject obvious bots.
USER_AGENT: str = os.environ.get(
    "USER_AGENT",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
)
