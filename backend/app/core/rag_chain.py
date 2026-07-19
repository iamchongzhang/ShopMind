"""RAG chain builder using LCEL (LangChain Expression Language).

Builds a chain that retrieves context, formats a prompt with citations,
and streams the LLM response.
"""

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

# ── Citation-aware system prompt ─────────────────────────────

RAG_SYSTEM_PROMPT = """You are ShopMind, a helpful AI assistant for an e-commerce platform.

When the user asks about products available in the catalog context below, use that information and cite your sources. When the user asks general questions unrelated to the catalog, answer helpfully using your own knowledge.

Guidelines for product questions:
- Each piece of context is labeled with its source filename.
- Cite your sources inline: after each factual statement, add [Source: filename].
- If multiple sources confirm the same fact, cite them all.
- For product specs, pricing, warranty, shipping, returns, and availability — always cite the exact source.
- When comparing products, highlight key differences in specs, price, and warranty.
- If the catalog does not contain the answer, let the user know, then offer what you know.

Sizing & body measurements — critical safety rules:
- When a user provides height, weight, or body measurements, they are asking for clothing size or fit recommendations. Always treat such inputs as sizing requests, even if not phrased as an explicit question.
- NEVER comment on the user's BMI, health status, body type, underweight/overweight, or weight in isolation. Do not calculate or mention BMI under any circumstances.
- Keep your response strictly about clothing sizes, garment measurements, and fit advice. Reference the catalog's size charts and product dimensions.
- If you cannot determine the right size from the catalog, explain what measurements would help and ask the user to clarify which product or category they are interested in.

Guidelines for general questions:
- Answer naturally and helpfully using your own knowledge.
- Do not fabricate product information — if you're unsure, say so.

Be concise but thorough. Use bullet points for lists and comparisons.

---

{context}

---

Current conversation:
{chat_history}

Human: {question}
Assistant:"""


# ── Helper functions ────────────────────────────────────────

def format_docs(docs: list) -> str:
    """Format retrieved documents with source IDs for the prompt."""
    if not docs:
        return "No relevant product information found in the catalog."

    formatted = []
    for i, doc in enumerate(docs):
        source = doc.metadata.get("filename", "unknown")
        chunk = doc.metadata.get("chunk_index", i)
        formatted.append(
            f"[Source: {source}]\n{doc.page_content}"
        )
    return "\n\n---\n\n".join(formatted)


# ── Chain builder ───────────────────────────────────────────

def build_rag_chain(llm, retriever, load_history_fn):
    """
    Build the RAG chain using LCEL.

    Args:
        llm: ChatOpenAI instance (streaming=True for SSE).
        retriever: Chroma retriever (MMR-configured).
        load_history_fn: Async callable that takes (conversation_id, db)
                         and returns a formatted chat history string.

    Returns:
        A LangChain chain that accepts {"question": str, "conversation_id": int, "db": AsyncSession}
        and streams the LLM response.
    """
    prompt = ChatPromptTemplate.from_template(RAG_SYSTEM_PROMPT)

    chain = (
        {
            # Use pre-computed context from input (avoids double retrieval)
            "context": lambda x: x.get("context", ""),
            "chat_history": lambda x: x.get("chat_history", ""),
            "question": lambda x: x["question"],
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain
