"""Document processing pipeline — Load, Split, Embed, Store.

Runs via FastAPI BackgroundTasks. Handles PDF, TXT, CSV, MD, DOCX, HTML.
"""

import asyncio
import logging
from pathlib import Path

from langchain_community.document_loaders import (
    CSVLoader,
    PyPDFLoader,
    TextLoader,
    UnstructuredHTMLLoader,
    UnstructuredMarkdownLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models.document import Document
from app.services.embedding_service import embed_and_store

logger = logging.getLogger("shopmind.document_processor")

# Absolute path to project root (backend/app/services -> project root)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = _PROJECT_ROOT / "data" / "uploads"


# ── Loader factory ──────────────────────────────────────────

def _get_loader(file_path: Path, file_type: str):
    """Return the appropriate LangChain document loader for the file type."""
    path_str = str(file_path)
    loaders = {
        "pdf": lambda: PyPDFLoader(path_str),
        "txt": lambda: TextLoader(path_str, encoding="utf-8"),
        "csv": lambda: CSVLoader(path_str),
        "md": lambda: UnstructuredMarkdownLoader(path_str),
        "docx": _load_docx(path_str),
        "html": lambda: UnstructuredHTMLLoader(path_str),
    }
    if file_type not in loaders:
        raise ValueError(f"Unsupported file type: {file_type}")
    return loaders[file_type]()


def _load_docx(path_str: str):
    """Lazy-import DOCX loader."""
    from langchain_community.document_loaders import Docx2txtLoader

    return Docx2txtLoader(path_str)


# ── Main processing pipeline ────────────────────────────────

async def process_document(document_id: int):
    """Full ingestion pipeline: Load → Split → Embed → Store → Update status.

    This function is designed to run as a FastAPI BackgroundTask.
    It creates its own database session for isolation.

    Args:
        document_id: The SQLite Document record ID.
    """
    async with async_session_factory() as db:
        try:
            # 1. Fetch document record
            result = await db.execute(select(Document).where(Document.id == document_id))
            doc = result.scalar_one_or_none()
            if doc is None:
                logger.error(f"Document {document_id} not found")
                return

            doc.status = "processing"
            await db.commit()

            # 2. Load document using absolute project path
            file_path = UPLOAD_DIR / doc.file_path
            logger.info(f"Processing document {document_id}: {doc.filename} ({file_path})")

            loader = _get_loader(file_path, doc.file_type)
            raw_documents = await asyncio.to_thread(loader.load)

            if not raw_documents:
                raise ValueError("Document loader returned no content.")

            # 3. Split into chunks
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                separators=["\n\n", "\n", ". ", "。", " ", ""],
                length_function=len,
            )
            chunks = splitter.split_documents(raw_documents)

            # 4. Enrich metadata
            for i, chunk in enumerate(chunks):
                chunk.metadata.update({
                    "document_id": str(doc.id),
                    "filename": doc.filename,
                    "chunk_index": i,
                    "source_type": doc.file_type,
                })

            # 5. Embed with caching and store
            texts = [chunk.page_content for chunk in chunks]
            await embed_and_store(texts, chunks, db=db)

            # 6. Update document status
            doc.chunk_count = len(chunks)
            doc.status = "completed"
            await db.commit()

            logger.info(f"Document {document_id} processed: {len(chunks)} chunks")

        except Exception as e:
            logger.error(f"Document {document_id} processing failed: {e}", exc_info=True)
            # Rollback the poisoned session before retrying
            try:
                await db.rollback()
            except Exception:
                pass  # Session may already be closed

            # Use a fresh session to update the document status
            try:
                async with async_session_factory() as fresh_db:
                    result = await fresh_db.execute(select(Document).where(Document.id == document_id))
                    doc = result.scalar_one_or_none()
                    if doc:
                        doc.status = "failed"
                        doc.error_message = str(e)[:1000]
                        await fresh_db.commit()
            except Exception as fresh_err:
                logger.error(
                    f"Failed to update document {document_id} status after processing error: {fresh_err}"
                )
