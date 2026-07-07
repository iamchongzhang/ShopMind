"""Embedding service — Bailian embeddings with SHA-256 caching.

Tracks which content has been embedded to avoid redundant API calls.
On re-upload, always stores to Chroma regardless of cache — the cache
only saves API costs, it does not replace Chroma storage.
"""

import logging

from langchain_core.documents import Document
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.caching import check_embedding_cache, hash_content, store_embedding_cache
from app.core.vector_store import get_vector_store

logger = logging.getLogger("shopmind.embeddings")


async def embed_and_store(
    texts: list[str],
    documents: list[Document],
    db: AsyncSession | None = None,
) -> None:
    """
    Embed texts and store them in Chroma. Uses cache to skip API calls
    for previously-embedded content, but ALWAYS writes to Chroma.
    """
    vector_store = get_vector_store()
    cached_count = 0

    for text in texts:
        content_hash = hash_content(text)

        if db and await check_embedding_cache(db, content_hash):
            cached_count += 1
        elif db:
            await store_embedding_cache(db, content_hash, text[:500])

    if cached_count > 0:
        logger.info("Embedding cache: %d/%d already cached (API calls saved)", cached_count, len(texts))
    else:
        logger.info("Embedding %d new chunks", len(texts))

    # Always store to Chroma — cache only saves API cost, not storage
    await vector_store.aadd_documents(documents)


async def embed_query(query: str) -> list[float]:
    """Embed a single query string."""
    vector_store = get_vector_store()
    return await vector_store.aembed_query(query)
