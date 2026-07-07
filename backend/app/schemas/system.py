"""Pydantic schemas for system endpoints."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    uptime_seconds: float


class StatsResponse(BaseModel):
    user_count: int
    document_count: int
    total_chunks: int
    completed_documents: int
    processing_documents: int
    failed_documents: int
