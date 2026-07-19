"""Product Catalog service — document CRUD and management."""

import logging
import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.vector_store import get_vector_store
from app.models.document import Document
from app.models.user import User
from app.schemas.knowledge_base import (
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentResponse,
    UploadResponse,
)
from app.utils.file_utils import validate_and_sanitize_file

# Absolute path to project root (backend/app/services -> project root)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = _PROJECT_ROOT / "data" / "uploads"

logger = logging.getLogger("shopmind")


async def upload_document(
    db: AsyncSession,
    file: UploadFile,
    current_user: User,
) -> UploadResponse:
    """Validate, save, and create a Document record. Returns immediately."""
    safe_name, file_ext = validate_and_sanitize_file(file)

    # Generate unique filename to avoid collisions
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / unique_name

    # Read and save
    content = await file.read()
    max_size = 50 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large.",
        )
    file_path.write_bytes(content)

    doc = Document(
        filename=safe_name,
        file_type=file_ext,
        file_path=unique_name,
        file_size=len(content),
        status="pending",
        uploaded_by=current_user.id,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    # Explicit commit so the background task can find the document
    await db.commit()

    logger.info("Document %d uploaded: %s (%s, %d bytes) by user %d",
                doc.id, safe_name, file_ext, len(content), current_user.id)

    return UploadResponse(id=doc.id, filename=doc.filename, status=doc.status)


async def list_documents(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    status_filter: str | None = None,
    file_type: str | None = None,
) -> DocumentListResponse:
    """Paginated list of documents with optional filters."""
    query = select(Document)
    count_query = select(func.count(Document.id))

    if status_filter:
        query = query.where(Document.status == status_filter)
        count_query = count_query.where(Document.status == status_filter)
    if file_type:
        query = query.where(Document.file_type == file_type)
        count_query = count_query.where(Document.file_type == file_type)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * per_page
    result = await db.execute(
        query.order_by(Document.created_at.desc()).offset(offset).limit(per_page)
    )
    documents = result.scalars().all()

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in documents],
        total=total,
        page=page,
        per_page=per_page,
    )


async def get_document(
    db: AsyncSession,
    document_id: int,
    chunk_offset: int = 0,
    chunk_limit: int = 200,
) -> DocumentDetailResponse:
    """Get a single document with chunk previews.

    Args:
        chunk_offset: Number of chunks to skip (for pagination).
        chunk_limit: Maximum chunks to return. Default 200, max 1000.
    """
    doc = await _get_doc_or_404(db, document_id)

    # Get chunk previews from vector store
    chunks = []
    total_chunks_in_store = 0
    try:
        vector_store = get_vector_store()
        # ChromaDB get() doesn't support offset natively — fetch enough
        # to cover the requested window, then slice client-side
        fetch_limit = chunk_offset + min(chunk_limit, 1000)
        results = vector_store.get(
            where={"document_id": str(document_id)},
            limit=fetch_limit,
        )
        total_chunks_in_store = doc.chunk_count
        all_chunks = list(zip(results["documents"], results["metadatas"]))
        window = all_chunks[chunk_offset: chunk_offset + chunk_limit]
        for i, (text, metadata) in enumerate(window):
            chunks.append({
                "chunk_index": metadata.get("chunk_index", chunk_offset + i),
                "content_preview": text[:200],
                "metadata": metadata,
            })
    except Exception:
        logger.warning("Chroma lookup failed for document %s — returning 0 chunks", document_id)

    detail = DocumentDetailResponse.model_validate(doc)
    detail.chunks = chunks
    detail.chunk_total = total_chunks_in_store
    return detail


async def delete_document(db: AsyncSession, document_id: int) -> None:
    """Delete a document, its file, and its vector chunks."""
    doc = await _get_doc_or_404(db, document_id)

    # Remove from vector store
    try:
        vector_store = get_vector_store()
        vector_store.delete(where={"document_id": str(document_id)})
    except Exception:
        logger.warning("Chroma vector deletion failed for document %s — orphaned vectors may remain", document_id)

    # Remove file
    file_path = UPLOAD_DIR / doc.file_path
    if file_path.exists():
        os.remove(file_path)

    await db.delete(doc)
    await db.flush()

    logger.info("Document %d deleted: %s", document_id, doc.filename)


async def reprocess_document(db: AsyncSession, document_id: int) -> DocumentResponse:
    """Re-process a document (delete old chunks then re-ingest)."""
    doc = await _get_doc_or_404(db, document_id)

    # Delete old chunks from Chroma
    try:
        vector_store = get_vector_store()
        vector_store.delete(where={"document_id": str(document_id)})
    except Exception:
        logger.warning("Chroma vector deletion failed for reprocess of document %s — duplicate chunks possible", document_id)

    # Reset status
    doc.status = "pending"
    doc.chunk_count = 0
    doc.error_message = None
    await db.flush()
    await db.refresh(doc)

    logger.info("Document %d queued for reprocessing: %s", document_id, doc.filename)

    return DocumentResponse.model_validate(doc)


async def _get_doc_or_404(db: AsyncSession, document_id: int) -> Document:
    """Fetch a document or raise 404."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc
