"""Q&A API routes — SSE streaming and sync endpoints."""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.qa import AnswerResponse, QuestionRequest
from app.services import qa_service

router = APIRouter(prefix="/api/qa", tags=["qa"])


@router.post("/ask")
async def ask_question(
    data: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ask a question with SSE streaming response.

    Returns a text/event-stream with token, citation, and done events.
    """
    return StreamingResponse(
        qa_service.ask_question_streaming(
            db=db,
            question=data.question,
            conversation_id=data.conversation_id,
            user_id=current_user.id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ask-sync", response_model=AnswerResponse)
async def ask_question_sync(
    data: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ask a question synchronously (non-streaming). Returns full answer with citations."""
    result = await qa_service.ask_question_sync(
        db=db,
        question=data.question,
        conversation_id=data.conversation_id,
        user_id=current_user.id,
    )
    return AnswerResponse(**result)
