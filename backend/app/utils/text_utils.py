"""Text processing utilities for citation parsing and content cleaning."""

import re

# Pattern matches both [Source: file.pdf, Chunk: 3] and [Source: file.pdf]
CITATION_PATTERN = re.compile(r"\[Source:\s*(.+?)\](?:\s*,\s*Chunk:\s*(\d+))?")


def extract_citations(text: str) -> list[dict]:
    """
    Extract citation markers from LLM response text.
    Returns list of {source, chunk, text} dicts.
    """
    citations = []
    for match in CITATION_PATTERN.finditer(text):
        source = match.group(1).strip()
        chunk_str = match.group(2)
        citations.append({
            "source": source,
            "chunk": int(chunk_str) if chunk_str else 0,
            "text": "",  # Populated later with actual chunk content
        })
    return citations


def clean_question(text: str) -> str:
    """Clean and normalize a user question before processing."""
    # Strip HTML tags
    text = re.sub(r"<[^>]*>", "", text)
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def truncate_assistant_content(content: str, max_length: int = 500) -> str:
    """Truncate assistant responses for chat history to save context window."""
    if len(content) <= max_length:
        return content
    return content[:max_length] + "..."


def build_chat_history(messages: list) -> str:
    """
    Build a formatted chat history string from message list.
    Messages should be in chronological order.
    """
    parts = []
    for msg in messages:
        if msg.role == "user":
            parts.append(f"Human: {msg.content}")
        elif msg.role == "assistant":
            truncated = truncate_assistant_content(msg.content)
            parts.append(f"Assistant: {truncated}")
    return "\n".join(parts)
