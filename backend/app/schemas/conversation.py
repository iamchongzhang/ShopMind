"""Pydantic schemas for conversation endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str = Field(default="New Conversation", max_length=255)


class ConversationUpdate(BaseModel):
    title: str = Field(max_length=255)


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    citations_json: str | None = None
    token_count: int | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse] = []


class ConversationListResponse(BaseModel):
    items: list[ConversationResponse]
    total: int
    page: int
    per_page: int
