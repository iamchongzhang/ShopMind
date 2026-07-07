"""FastAPI application entry point."""

import os

# Disable ChromaDB anonymous telemetry
os.environ["ANONYMIZED_TELEMETRY"] = "False"

import sys
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure the backend directory is on sys.path for `app.*` imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.knowledge_base import router as kb_router
from app.api.qa import router as qa_router
from app.api.system import router as system_router
from app.config import settings
from app.core.database import init_db
from app.core.logging_config import request_id_var, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — runs init_db and logging setup on startup."""
    setup_logging(debug=settings.debug)
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    description="ShopMind — AI-Powered Product Knowledge Assistant for E-Commerce",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "auth", "description": "Authentication — register, login, profile"},
        {"name": "knowledge-base", "description": "Product Library — document management (admin only)"},
        {"name": "qa", "description": "RAG-powered Q&A with streaming"},
        {"name": "conversations", "description": "Conversation and message management"},
        {"name": "system", "description": "Health check and statistics"},
    ],
)

# ── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiting ───────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if settings.rate_limit_enabled:
    app.add_middleware(SlowAPIMiddleware)


# ── Request ID Middleware ───────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Attach a unique request ID to every request for log tracing."""
    req_id = str(uuid.uuid4())[:8]
    request_id_var.set(req_id)
    start_time = time.time()

    response = await call_next(request)

    duration_ms = round((time.time() - start_time) * 1000)
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Response-Time-Ms"] = str(duration_ms)
    return response


# ── Routers ─────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(kb_router)
app.include_router(qa_router)
app.include_router(conversations_router)
app.include_router(system_router)


# ── Global error handlers ───────────────────────────────────────

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "http_error"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "type": "validation_error"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    import logging
    logger = logging.getLogger("shopmind")
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "internal_error"},
    )
