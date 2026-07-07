"""Import all models so Base.metadata.create_all discovers them."""

from app.models.conversation import Conversation
from app.models.document import Document
from app.models.embedding_cache import EmbeddingCache
from app.models.message import Message
from app.models.user import User

__all__ = ["User", "Document", "Conversation", "Message", "EmbeddingCache"]
