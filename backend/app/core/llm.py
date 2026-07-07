"""LLM provider factory — Bailian (Alibaba Cloud) via OpenAI-compatible API."""

from langchain_openai import ChatOpenAI

from app.config import settings


def get_llm(streaming: bool = True) -> ChatOpenAI:
    """Create a ChatOpenAI instance configured for the Bailian API.

    Bailian exposes an OpenAI-compatible endpoint at dashscope-intl.aliyuncs.com.

    Args:
        streaming: Enable token-level streaming (True for SSE, False for sync).
    """
    return ChatOpenAI(
        model=settings.bailian_llm_model,
        api_key=settings.bailian_api_key,
        base_url=settings.bailian_base_url,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        streaming=streaming,
    )
