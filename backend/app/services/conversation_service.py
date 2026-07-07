"""Conversation service — CRUD operations for conversations and messages."""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import (
    ConversationCreate,
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationResponse,
    MessageResponse,
)


async def create_conversation(
    db: AsyncSession, user_id: int, data: ConversationCreate
) -> ConversationResponse:
    """Create a new conversation for a user."""
    conv = Conversation(user_id=user_id, title=data.title)
    db.add(conv)
    await db.flush()
    await db.refresh(conv)
    return ConversationResponse.model_validate(conv)


async def list_conversations(
    db: AsyncSession, user_id: int, page: int = 1, per_page: int = 50
) -> ConversationListResponse:
    """List a user's conversations, newest first."""
    query = select(Conversation).where(Conversation.user_id == user_id)
    count_query = select(func.count(Conversation.id)).where(Conversation.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * per_page
    result = await db.execute(
        query.order_by(Conversation.updated_at.desc()).offset(offset).limit(per_page)
    )
    conversations = result.scalars().all()

    return ConversationListResponse(
        items=[ConversationResponse.model_validate(c) for c in conversations],
        total=total,
        page=page,
        per_page=per_page,
    )


async def get_conversation(db: AsyncSession, conversation_id: int, user_id: int) -> ConversationDetailResponse:
    """Get a conversation with all its messages."""
    conv = await _get_conv_or_404(db, conversation_id)

    if conv.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    messages = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = messages.scalars().all()

    detail = ConversationDetailResponse.model_validate(conv)
    detail.messages = [MessageResponse.model_validate(m) for m in messages]
    return detail


async def update_conversation(
    db: AsyncSession, conversation_id: int, user_id: int, title: str
) -> ConversationResponse:
    """Update a conversation's title."""
    conv = await _get_conv_or_404(db, conversation_id)

    if conv.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    conv.title = title
    db.add(conv)
    await db.flush()
    await db.refresh(conv)
    return ConversationResponse.model_validate(conv)


async def delete_conversation(db: AsyncSession, conversation_id: int, user_id: int) -> None:
    """Delete a conversation and all its messages (cascade)."""
    conv = await _get_conv_or_404(db, conversation_id)

    if conv.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    await db.delete(conv)
    await db.flush()


async def _get_conv_or_404(db: AsyncSession, conversation_id: int) -> Conversation:
    """Fetch a conversation or raise 404."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv
