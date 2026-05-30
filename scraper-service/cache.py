"""A tiny async-safe in-memory TTL cache.

Avoids hammering upstream job sources when the web app requests the same
role/city repeatedly. Single-process only — good enough for one container.
"""

import time
import asyncio
from typing import Any, Awaitable, Callable, Dict, Tuple

_store: Dict[str, Tuple[float, Any]] = {}
_lock = asyncio.Lock()


async def cached(key: str, ttl: int, producer: Callable[[], Awaitable[Any]]) -> Any:
    """Return cached value for `key`, or run `producer()` and cache the result.

    Only non-empty results are cached, so a transient upstream failure (which
    yields an empty list) is retried on the next call rather than memoised.
    """
    now = time.time()
    async with _lock:
        hit = _store.get(key)
        if hit and hit[0] > now:
            return hit[1]

    value = await producer()

    if value:
        async with _lock:
            _store[key] = (now + ttl, value)
    return value


def clear() -> None:
    _store.clear()
