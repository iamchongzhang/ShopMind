"""Caching utilities — embedding cache, query cache, response cache."""

import hashlib

from cachetools import LRUCache, TTLCache

# In-memory LRU caches
query_embedding_cache: LRUCache = LRUCache(maxsize=1000)
document_list_cache: TTLCache = TTLCache(maxsize=256, ttl=30)

# Optional: persistent LLM response cache via diskcache
try:
    from diskcache import Cache

    llm_response_cache: Cache | None = Cache("./data/cache/llm_responses")
except Exception:
    llm_response_cache = None


# ── Embedding Cache (SQLite-backed) ─────────────────────────

def hash_content(content: str) -> str:
    """Compute a SHA-256 hash of text content for cache lookups."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


async def check_embedding_cache(db, content_hash: str) -> bool:
    """Check if an embedding for the given content hash exists in the DB cache."""
    from sqlalchemy import select

    from app.models.embedding_cache import EmbeddingCache

    result = await db.execute(
        select(EmbeddingCache).where(EmbeddingCache.content_hash == content_hash)
    )
    return result.scalar_one_or_none() is not None


async def store_embedding_cache(db, content_hash: str, text_preview: str) -> None:
    """Store an embedding cache entry in the database."""
    from app.models.embedding_cache import EmbeddingCache

    entry = EmbeddingCache(
        content_hash=content_hash,
        text_preview=text_preview[:500],
    )
    db.add(entry)
    await db.flush()
