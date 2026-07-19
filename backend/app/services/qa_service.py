"""Q&A service — RAG-powered question answering with streaming and citations."""

import asyncio
import json
import logging
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.llm import get_llm
from app.core.rag_chain import build_rag_chain, format_docs
from app.core.vector_store import get_retriever
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.qa import CitationSchema
from app.utils.text_utils import build_chat_history, extract_citations, normalize_query

logger = logging.getLogger("shopmind.qa")

# Fallback message used when the LLM produces no output (content filter, etc.).
# Must NOT contain raw retrieval chunks — general guidance only.
_FALLBACK_RESPONSE = (
    "I wasn't able to process this query. For the best results, try:\n"
    "- Asking about a specific product or category\n"
    "- For sizing, mentioning the exact item (e.g. \"What size oxford shirt should I get?\")\n"
    "- Rephrasing your question if it was flagged by a content filter"
)


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

    # Commit now to release the SQLite write lock BEFORE the long retrieval+LLM phase.
    # Without this, the write transaction stays open for the full streaming duration
    # (3-7+ seconds) and blocks all other concurrent writers.
    await db.commit()

    # 3. Load history, normalize query, retrieve context
    chat_history = await _load_history(conversation_id, db)

    # ── Layer 2: rewrite body-measurement statements as explicit sizing queries ──
    original_question = question
    question, rewrite_reason = normalize_query(question, chat_history)
    if rewrite_reason:
        logger.info("Query rewritten: %s", rewrite_reason)

    retriever = get_retriever()
    docs = await retriever.ainvoke(question)
    context_str = format_docs(docs)

    # 4. Build and stream
    llm = get_llm(streaming=True)
    chain = build_rag_chain(llm, retriever, _load_history)

    full_response = ""
    assistant_msg_id = 0
    content_filtered = False

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

        # ── Layer 3: verify content_filter and token_count ──
        token_count = len(full_response.split()) if full_response.strip() else 0

        if token_count == 0:
            content_filtered = True
            logger.warning(
                "LLM returned 0 tokens — content_filter likely. "
                "Question length=%d chars, rewritten=%s",
                len(original_question),
                rewrite_reason is not None,
            )
            full_response = _FALLBACK_RESPONSE
            yield f'{{"type":"error","content":{json.dumps(_FALLBACK_RESPONSE)}}}\n'
        else:
            logger.debug(
                "LLM streaming complete: %d tokens, %d chars",
                token_count,
                len(full_response),
            )

    except asyncio.TimeoutError:
        content_filtered = True
        logger.error(
            "LLM streaming timed out after %ds. Question length=%d chars",
            settings.llm_request_timeout,
            len(original_question),
        )
        full_response = _FALLBACK_RESPONSE
        yield f'{{"type":"error","content":"The request timed out. Please try again or rephrase your question."}}\n'
    except Exception as e:
        logger.error(f"LLM streaming error: {e}", exc_info=True)
        full_response = full_response or _FALLBACK_RESPONSE
        yield f'{{"type":"error","content":"An error occurred during generation."}}\n'

    # 5. Extract citations (from whatever content we have)
    citations = extract_citations(full_response)
    if citations:
        for cit in citations:
            for doc in docs:
                if doc.metadata.get("filename") == cit["source"] and doc.metadata.get("chunk_index") == cit["chunk"]:
                    cit["text"] = doc.page_content[:300]
                    break
        yield f'{{"type":"citation","sources":{json.dumps(citations, ensure_ascii=False)}}}\n'

    # 6. Save assistant message — always save, even if it's the fallback
    try:
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
        assistant_msg_id = assistant_msg.id

        # 7. Update conversation title from first question if new
        result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
        conv = result.scalar_one_or_none()
        if conv and conv.title == "New Conversation":
            conv.title = original_question[:80]
            db.add(conv)
            await db.flush()

        await db.commit()
    except Exception as save_err:
        logger.error("Failed to save assistant message: %s", save_err, exc_info=True)
        try:
            await db.rollback()
        except Exception:
            pass

    # ── Layer 3: always yield done, even if everything above failed ──
    yield f'{{"type":"done","message_id":{assistant_msg_id},"conversation_id":{conversation_id}}}\n'


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

    # Commit now to release the SQLite write lock before the long LLM call.
    await db.commit()

    # 3. Get context & generate
    chat_history = await _load_history(conversation_id, db)

    original_question = question
    question, rewrite_reason = normalize_query(question, chat_history)
    if rewrite_reason:
        logger.info("Query rewritten (sync): %s", rewrite_reason)

    retriever = get_retriever()
    docs = await retriever.ainvoke(question)
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

    # Check for content-filtered (empty) response
    if not full_response.strip():
        logger.warning(
            "LLM returned 0 tokens (sync) — content_filter likely. "
            "Question length=%d chars",
            len(original_question),
        )
        full_response = _FALLBACK_RESPONSE

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
