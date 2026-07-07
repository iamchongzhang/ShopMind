"""Shared fixtures and configuration for all backend tests.

Uses a single in-memory SQLite database shared across all tests in a session.
Each test gets a clean state via transaction rollback.
"""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

TEST_DATABASE_URL = "sqlite+aiosqlite://"

# Shared engine + session factory (initialized once per session)
_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
_session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _init_db():
    """Create all tables once at the start of the test session."""
    from app.core.database import Base
    import app.models  # noqa: F401

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    await _engine.dispose()


@pytest_asyncio.fixture
async def db_session():
    """Provide a fresh database session, rolled back after the test."""
    async with _session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client():
    """Provide an async HTTP test client.

    Each request gets its own DB session that commits independently,
    so multi-step tests (register → login → use token) work correctly.
    """
    from app.main import app
    from app.core.database import get_db

    async def override_get_db():
        async with _session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
