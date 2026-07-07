"""System API routes — health check and stats."""

import time

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.dependencies import require_admin
from app.models.document import Document
from app.models.user import User
from app.schemas.system import HealthResponse, StatsResponse

router = APIRouter(tags=["system"])

_start_time = time.time()


@router.get("/api/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        uptime_seconds=round(time.time() - _start_time, 2),
    )


@router.get("/api/stats", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Return system statistics (admin only)."""
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    doc_count = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    total_chunks = (await db.execute(select(func.sum(Document.chunk_count)))).scalar() or 0
    completed = (await db.execute(select(func.count(Document.id)).where(Document.status == "completed"))).scalar() or 0
    processing = (await db.execute(select(func.count(Document.id)).where(Document.status == "processing"))).scalar() or 0
    failed = (await db.execute(select(func.count(Document.id)).where(Document.status == "failed"))).scalar() or 0

    return StatsResponse(
        user_count=user_count,
        document_count=doc_count,
        total_chunks=total_chunks,
        completed_documents=completed,
        processing_documents=processing,
        failed_documents=failed,
    )
