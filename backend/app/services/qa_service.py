"""Q&A service — RAG-powered question answering with streaming and citations."""

import json
import logging
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import get_llm
from app.core.rag_chain import build_rag_chain, format_docs
from app.core.vector_store import get_retriever
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.qa import CitationSchema
from app.utils.text_utils import build_chat_history, extract_citations

logger = logging.getLogger("shopmind.qa")


async def _load_history(conversation_id: int, db: AsyncSession) -> str:
    """Load recent conversation messages and format as chat history."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    messages = result.scalars().all()
    return build_chat_history(list(reversed(messages)))


async def ask_question_streaming(
    db: AsyncSession,
    question: str,
    conversation_id: int | None = None,
    user_id: int | None = None,
) -> AsyncGenerator[str, None]:
    """
    Answer a question via RAG with SSE streaming.

    Yields JSON-encoded SSE events:
      {"type": "token", "content": "..."}
      {"type": "citation", "sources": [...]}
      {"type": "done", "message_id": N, "conversation_id": N}
    """
    # 1. Ensure conversation exists
    if conversation_id is None and user_id is not None:
        conv = Conversation(user_id=user_id, title=question[:80])
        db.add(conv)
        await db.flush()
        await db.refresh(conv)
        conversation_id = conv.id
    elif conversation_id is not None:
        result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
        conv = result.scalar_one_or_none()
        if conv is None and user_id is not None:
            conv = Conversation(id=conversation_id, user_id=user_id, title=question[:80])
            db.add(conv)
            await db.flush()
            await db.refresh(conv)
    else:
        raise ValueError("Either conversation_id or user_id must be provided.")

    # 2. Save user message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=question,
    )
    db.add(user_msg)
    await db.flush()

    # 3. Load history & retrieve context (do retrieval ONCE here)
    chat_history = await _load_history(conversation_id, db)
    retriever = get_retriever()
    docs = retriever.invoke(question)
    context_str = format_docs(docs)

    # 4. Build and stream (pass pre-computed context to avoid double retrieval)
    llm = get_llm(streaming=True)
    chain = build_rag_chain(llm, retriever, _load_history)

    full_response = ""
    try:
        async for chunk in chain.astream({
            "question": question,
            "chat_history": chat_history,
            "context": context_str,
            "conversation_id": conversation_id,
            "db": db,
        }):
            full_response += chunk
            yield f'{{"type":"token","content":{json.dumps(chunk)}}}\n'
    except Exception as e:
        logger.error(f"LLM streaming error: {e}", exc_info=True)
        yield f'{{"type":"error","content":"An error occurred during generation."}}\n'

    # 5. Extract citations
    citations = extract_citations(full_response)
    if citations:
        # Enrich citations with actual chunk text
        for cit in citations:
            for doc in docs:
                if doc.metadata.get("filename") == cit["source"] and doc.metadata.get("chunk_index") == cit["chunk"]:
                    cit["text"] = doc.page_content[:300]
                    break
        yield f'{{"type":"citation","sources":{json.dumps(citations, ensure_ascii=False)}}}\n'

    # 6. Save assistant message
    citations_json = json.dumps(citations, ensure_ascii=False) if citations else None
    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=full_response,
        citations_json=citations_json,
        token_count=len(full_response.split()),  # Approximate
    )
    db.add(assistant_msg)
    await db.flush()

    # 7. Update conversation title from first question if new
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if conv and conv.title == "New Conversation":
        conv.title = question[:80]
        db.add(conv)
        await db.flush()

    yield f'{{"type":"done","message_id":{assistant_msg.id},"conversation_id":{conversation_id}}}\n'


async def ask_question_sync(
    db: AsyncSession,
    question: str,
    conversation_id: int | None = None,
    user_id: int | None = None,
) -> dict:
    """Synchronous (non-streaming) version for simpler API clients."""
    # 1. Ensure conversation
    if conversation_id is None and user_id is not None:
        conv = Conversation(user_id=user_id, title=question[:80])
        db.add(conv)
        await db.flush()
        await db.refresh(conv)
        conversation_id = conv.id

    # 2. Save user message
    user_msg = Message(conversation_id=conversation_id, role="user", content=question)
    db.add(user_msg)
    await db.flush()

    # 3. Get context & generate
    chat_history = await _load_history(conversation_id, db)
    retriever = get_retriever()
    docs = retriever.invoke(question)
    context_str = format_docs(docs)

    llm = get_llm(streaming=False)
    chain = build_rag_chain(llm, retriever, _load_history)

    full_response = await chain.ainvoke({
        "question": question,
        "chat_history": chat_history,
        "context": context_str,
        "conversation_id": conversation_id,
        "db": db,
    })

    # 4. Extract citations
    citations = extract_citations(full_response)
    for cit in citations:
        for doc in docs:
            if doc.metadata.get("filename") == cit["source"] and doc.metadata.get("chunk_index") == cit["chunk"]:
                cit["text"] = doc.page_content[:300]
                break

    # 5. Save assistant message
    citations_json = json.dumps(citations, ensure_ascii=False) if citations else None
    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=full_response,
        citations_json=citations_json,
        token_count=len(full_response.split()),
    )
    db.add(assistant_msg)
    await db.flush()

    return {
        "answer": full_response,
        "citations": citations,
        "message_id": assistant_msg.id,
        "conversation_id": conversation_id,
    }
