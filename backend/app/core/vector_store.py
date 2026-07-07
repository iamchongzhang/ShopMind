"""Chroma vector store initialization and retriever factory."""

from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from openai import OpenAI

from app.config import settings


class BailianEmbeddings(Embeddings):
    """Custom embedding wrapper for Bailian (Alibaba Cloud) API.

    Uses the raw OpenAI client to avoid langchain_openai's chunking which
    can produce malformed requests on some Bailian workspace deployments.
    """

    def __init__(self):
        self._client = OpenAI(
            api_key=settings.bailian_api_key,
            base_url=settings.bailian_base_url,
            timeout=30,
        )
        self._model = settings.bailian_embedding_model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of documents.

        Bailian supports up to 25 texts per request in batch mode.
        """
        results: list[list[float]] = []
        # Batch in groups of 25 to respect Bailian limits
        for i in range(0, len(texts), 25):
            batch = texts[i:i + 25]
            # Filter out empty strings which cause API errors
            batch = [t for t in batch if t.strip()]
            if not batch:
                continue
            response = self._client.embeddings.create(
                model=self._model,
                input=batch,
            )
            results.extend([d.embedding for d in response.data])
        return results

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string."""
        return self.embed_documents([text])[0]


def get_embeddings() -> BailianEmbeddings:
    """Create a BailianEmbeddings instance."""
    return BailianEmbeddings()


def get_vector_store() -> Chroma:
    """Get or create the Chroma vector store collection."""
    return Chroma(
        collection_name=settings.chroma_collection_name,
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_persist_dir,
    )


def get_retriever():
    """Build an MMR retriever for the RAG chain.

    fetch_k=20: initial candidate pool
    k=8: final results after MMR
    lambda_mult=0.7: relevance (1=similarity, 0=diversity)
    """
    return get_vector_store().as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": settings.retrieval_k,
            "fetch_k": settings.retrieval_fetch_k,
            "lambda_mult": settings.retrieval_lambda_mult,
        },
    )
