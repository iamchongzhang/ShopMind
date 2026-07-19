"""Pydantic schemas for product catalog endpoints."""

from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    file_size: int | None = None
    chunk_count: int
    status: str
    error_message: str | None = None
    uploaded_by: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    per_page: int


class UploadResponse(BaseModel):
    id: int
    filename: str
    status: str
    message: str = "Document uploaded successfully. Processing started."


class ReprocessResponse(BaseModel):
    id: int
    status: str
    message: str = "Document reprocessing started."


class ChunkPreview(BaseModel):
    chunk_index: int
    content_preview: str
    metadata: dict


class DocumentDetailResponse(DocumentResponse):
    chunks: list[ChunkPreview] = []
    chunk_total: int = 0
