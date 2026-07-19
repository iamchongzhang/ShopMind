"""Product Library API routes — admin-only document management."""

from fastapi import APIRouter, BackgroundTasks, Depends, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.knowledge_base import (
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentResponse,
    ReprocessResponse,
    UploadResponse,
)
from app.services import kb_service
from app.services.document_processor import process_document

router = APIRouter(prefix="/api/kb", tags=["knowledge-base"])


@router.post("/documents", response_model=UploadResponse, status_code=202)
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document for product catalog ingestion (admin only).

    Returns immediately with status 202. Processing happens in the background.
    """
    upload = await kb_service.upload_document(db, file, current_user)
    background_tasks.add_task(process_document, upload.id)
    return upload


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    file_type: str | None = Query(None),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all Product Library documents (admin only)."""
    return await kb_service.list_documents(db, page, per_page, status, file_type)


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: int,
    chunk_offset: int = Query(0, ge=0),
    chunk_limit: int = Query(200, ge=1, le=1000),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get document details with chunk previews (admin only).

    Supports pagination via chunk_offset and chunk_limit query params.
    """
    return await kb_service.get_document(db, document_id, chunk_offset, chunk_limit)


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: int,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and its vector chunks (admin only)."""
    await kb_service.delete_document(db, document_id)


@router.put("/documents/{document_id}/reprocess", response_model=ReprocessResponse)
async def reprocess_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Re-process a document (admin only).

    Deletes old vector chunks and re-runs the ingestion pipeline.
    """
    doc = await kb_service.reprocess_document(db, document_id)
    background_tasks.add_task(process_document, document_id)
    return ReprocessResponse(id=doc.id, status=doc.status)
