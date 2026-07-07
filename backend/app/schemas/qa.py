"""Pydantic schemas for Q&A endpoints."""

from pydantic import BaseModel, Field


class CitationSchema(BaseModel):
    source: str
    chunk: int
    text: str


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4096)
    conversation_id: int | None = None


class AnswerResponse(BaseModel):
    answer: str
    citations: list[CitationSchema] = []
    message_id: int
    conversation_id: int


class SSETokenEvent(BaseModel):
    type: str = "token"
    content: str


class SSECitationEvent(BaseModel):
    type: str = "citation"
    sources: list[CitationSchema]


class SSEDoneEvent(BaseModel):
    type: str = "done"
    message_id: int
    conversation_id: int
