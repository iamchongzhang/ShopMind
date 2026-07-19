"""Text processing utilities for citation parsing, content cleaning, and query normalization."""

import logging
import re

logger = logging.getLogger("shopmind.text_utils")

# Pattern matches both [Source: file.pdf, Chunk: 3] and [Source: file.pdf]
CITATION_PATTERN = re.compile(r"\[Source:\s*(.+?)\](?:\s*,\s*Chunk:\s*(\d+))?")

# ── Query normalization patterns (Layer 2: input rewriting) ──────

# Height: 175 cm, 5'11", 1.75 m, 5ft 10in, etc.
_HEIGHT_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:cm|centimet(?:er|re)s?)\b"
    r"|\d+\s*(?:ft|feet|foot|')\s*(?:\d+\s*(?:in(?:ch(?:es)?)?|\"))?\b"
    r"|\d+(?:\.\d+)?\s*m(?:et(?:er|re)s?)?\b(?!\w)",
    re.IGNORECASE,
)

# Weight: 50 kg, 110 lbs, 12 stone, etc.
_WEIGHT_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:kg|kilos?|kilograms?)\b"
    r"|\d+(?:\.\d+)?\s*(?:lbs?|pounds?)\b"
    r"|\d+(?:\.\d+)?\s*st(?:one)?\b",
    re.IGNORECASE,
)

# First-person perspective markers
_FIRST_PERSON_RE = re.compile(
    r"\b(?:I(?:\'m|\s+am)|my\b|I\s+(?:weigh|measure)\b"
    r"|my\s+(?:stats|measurements|size|height|weight|body|build|physique)\b"
    r"|I\s+(?:have|got)\b)",
    re.IGNORECASE,
)

# Explicit question indicators — if any of these are present, the input is
# already a question and should not be rewritten.
_QUESTION_RE = re.compile(
    r"\?|"
    r"\b(?:what|which|how|should|can|could|would|recommend|suggest|suggestion|"
    r"help|find|looking\s+for|need|tell\s+me|do\s+(?:you|I)|does\s+(?:this|it)|"
    r"where|when|who|will|shall|is\s+(?:this|there|it)|are\s+(?:there|you|these))",
    re.IGNORECASE,
)

# Size/fit intent signals — if present alongside measurements, the user
# is likely asking about clothing even without an explicit question word.
_SIZE_INTENT_RE = re.compile(
    r"\b(?:sizes?|sizing|fits?|fitting|measurements?|size\s+(?:chart|guide)|"
    r"chest|waist|hips?|inseam|bust)\b",
    re.IGNORECASE,
)


def normalize_query(question: str, chat_history: str = "") -> tuple[str, str | None]:
    """Detect body-measurement statements lacking explicit questions and rewrite
    them as sizing requests so the LLM stays in e-commerce territory.

    Returns ``(normalized_question, reason)`` where *reason* is ``None`` when
    no rewrite was performed.  The *reason* string is safe to log — it never
    includes the raw user input.
    """
    cleaned = question.strip()

    # Skip rewriting when it is already an explicit question.
    if _QUESTION_RE.search(cleaned):
        return cleaned, None

    # Must contain at least one body-measurement value.
    has_height = bool(_HEIGHT_RE.search(cleaned))
    has_weight = bool(_WEIGHT_RE.search(cleaned))
    if not (has_height or has_weight):
        return cleaned, None

    # Must have either first-person perspective or a size/fit intent signal.
    has_first_person = bool(_FIRST_PERSON_RE.search(cleaned))
    has_size_intent = bool(_SIZE_INTENT_RE.search(cleaned))

    if not (has_first_person or has_size_intent):
        return cleaned, None

    # Check conversation context: if the assistant recently asked for
    # measurements, the user is likely responding directly.
    context_signals = False
    if chat_history:
        context_signals = bool(
            _SIZE_INTENT_RE.search(chat_history)
            or _HEIGHT_RE.search(chat_history)
            or _WEIGHT_RE.search(chat_history)
        )

    # Build a concise, log-safe reason identifier.
    signals = []
    if has_height:
        signals.append("height")
    if has_weight:
        signals.append("weight")
    if has_first_person:
        signals.append("first_person")
    if has_size_intent:
        signals.append("size_intent")
    if context_signals:
        signals.append("context")
    reason = "+".join(signals)

    rewritten = f"What size should I choose? {cleaned}"
    return rewritten, reason


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
