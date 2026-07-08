# CLAUDE.md

## ShopMind — AI-Powered Product Knowledge Assistant for E-Commerce

Enterprise RAG (Retrieval-Augmented Generation) system that lets users ask product questions and get AI-powered answers with source citations. Built with LangChain + Alibaba Cloud Bailian (Qwen), Chroma vector store, SQLite, FastAPI backend, and React 19 + Ant Design frontend.

---

## Architecture Overview

```
User Browser (React SPA)
    │  /api/*  (Vite dev proxy → localhost:8000)
    ▼
FastAPI Backend (Uvicorn, single worker by default)
    ├── JWT Auth (python-jose HS256, bcrypt 12 rounds)
    ├── Rate Limiter (SlowAPI, 200 req/min per IP — disable for load tests)
    ├── Request-ID Middleware (UUID trace per request → JSON logs)
    ├── CORS Middleware
    ├── 5 API Routers → Service Layer
    │
    ├── SQLite (aiosqlite, WAL mode, pool_size=5, max_overflow=10)
    │   Tables: users, conversations, messages, documents, embedding_cache
    │
    ├── Chroma Vector Store (persistent, data/chroma/, collection: kb_chunks)
    │   Embeddings: Bailian text-embedding-v2 (OpenAI-compatible endpoint)
    │   Retrieval: MMR, k=8, fetch_k=20, lambda_mult=0.7
    │
    └── Bailian API (OpenAI-compatible)
        LLM: qwen3.7-max (overridden in .env), temp=0.1, max_tokens=2048
        Base URL: ws-074c99f6gufx2ec0.cn-beijing.maas.aliyuncs.com
```

---

## Directory Structure

```
f:/LangChainRAG/
├── backend/                        # FastAPI backend
│   ├── app/
│   │   ├── main.py                 # App entry: lifespan, middleware, routers
│   │   ├── config.py               # Pydantic Settings from .env
│   │   ├── dependencies.py         # get_current_user, require_admin
│   │   ├── api/                    # Route handlers (5 routers)
│   │   │   ├── auth.py             # /api/auth/* (register, login, me, change-password)
│   │   │   ├── qa.py               # /api/qa/* (SSE ask, sync ask-sync)
│   │   │   ├── conversations.py    # /api/conversations/* (CRUD)
│   │   │   ├── knowledge_base.py   # /api/kb/* (admin: upload, list, delete, reprocess)
│   │   │   └── system.py           # /api/health, /api/stats
│   │   ├── core/                   # Infrastructure
│   │   │   ├── database.py         # Async SQLAlchemy engine + session (WAL mode, pool 5+10)
│   │   │   ├── security.py         # bcrypt hash/verify, JWT create/decode (HS256)
│   │   │   ├── llm.py              # ChatOpenAI factory → Bailian endpoint
│   │   │   ├── vector_store.py     # BailianEmbeddings + Chroma collection + MMR retriever
│   │   │   ├── rag_chain.py        # LCEL chain builder + RAG system prompt
│   │   │   ├── caching.py          # LRU (1000 entries), TTL (30s), diskcache, DB embedding cache
│   │   │   └── logging_config.py   # JSON-formatted rotating file logger
│   │   ├── models/                 # SQLAlchemy ORM (5 tables)
│   │   │   ├── user.py             # users (id, username, password_hash, role, email, is_active)
│   │   │   ├── conversation.py     # conversations (id, user_id FK, title) → messages relationship
│   │   │   ├── message.py          # messages (id, conversation_id FK, role, content, citations_json, token_count)
│   │   │   ├── document.py         # documents (id, filename, file_type, file_path, status, chunk_count, uploaded_by FK)
│   │   │   └── embedding_cache.py  # embedding_cache (id, content_hash SHA-256 unique, text_preview)
│   │   ├── schemas/                # Pydantic request/response models
│   │   │   ├── auth.py             # RegisterRequest, LoginRequest, TokenResponse, UserResponse, ChangePasswordRequest
│   │   │   ├── qa.py               # QuestionRequest, AnswerResponse, CitationSchema, SSE events (Token, Citation, Done)
│   │   │   ├── conversation.py     # ConversationCreate/Update/Response/DetailResponse/ListResponse, MessageResponse
│   │   │   ├── knowledge_base.py   # DocumentResponse/ListResponse/DetailResponse, UploadResponse, ChunkPreview
│   │   │   └── system.py           # HealthResponse, StatsResponse
│   │   ├── services/               # Business logic
│   │   │   ├── auth_service.py     # register_user, login_user, change_password
│   │   │   ├── qa_service.py       # ask_question_streaming (SSE generator), ask_question_sync
│   │   │   ├── conversation_service.py  # CRUD with ownership checks
│   │   │   ├── kb_service.py       # Document CRUD, Chroma chunk management
│   │   │   ├── document_processor.py    # Background task: load→split→embed→store
│   │   │   └── embedding_service.py     # embed_and_store with hash-based API call caching
│   │   └── utils/
│   │       ├── file_utils.py       # MIME validation, filename sanitization, save upload
│   │       └── text_utils.py       # extract_citations, clean_question, build_chat_history
│   ├── tests/
│   │   ├── conftest.py             # In-memory SQLite fixtures (async), httpx test client
│   │   ├── test_auth.py            # 8 tests: register, login, me, change-password, admin guard
│   │   └── stress/
│   │       ├── __init__.py         # Locust package marker
│   │       └── reports/.gitkeep    # Report output directory
│   └── requirements.txt            # 25+ deps: fastapi, langchain 0.3.x, chromadb, sqlalchemy, etc.
│
├── frontend/                       # React 19 + TypeScript 6 + Vite 8
│   ├── src/
│   │   ├── main.tsx                # Entry: StrictMode, mounts App
│   │   ├── App.tsx                 # Providers: QueryClient (TanStack), ConfigProvider (Ant Design theme), RouterProvider
│   │   ├── router.tsx              # React Router v7: /login, /register, /chat, /chat/:id, /admin/knowledge-base, /profile, *
│   │   ├── index.css               # Design tokens, CSS custom properties, markdown/streaming/skeleton styles
│   │   ├── api/                    # API client layer
│   │   │   ├── client.ts          # Axios instance (/api base, JWT interceptor, 401→/login redirect)
│   │   │   ├── auth.ts            # login, register, getMe, changePassword
│   │   │   ├── qa.ts              # askQuestionStream (SSE fetch, AbortController) — not currently used by ChatContainer
│   │   │   ├── conversations.ts   # list, create, get, update, delete
│   │   │   └── knowledgeBase.ts   # list, get, upload (multipart), delete, reprocess
│   │   ├── components/
│   │   │   ├── Auth/              # LoginForm, RegisterForm, ChangePasswordForm
│   │   │   ├── Chat/              # ChatContainer, ChatInput, MessageList, MessageBubble, CitationBadge, MarkdownRenderer
│   │   │   ├── KnowledgeBase/     # KBManagement, DocumentUploader (Drag & Drop), DocumentTable (5s auto-refresh), DocumentDetail (Drawer)
│   │   │   └── Layout/            # AppLayout (collapsible Sider 280px, Header, Outlet), ConversationList
│   │   ├── pages/                 # ChatPage, LoginPage, RegisterPage, KnowledgeBasePage, ProfilePage, NotFoundPage
│   │   ├── store/
│   │   │   ├── authStore.ts       # Zustand: token, user, isAuthenticated, login/register/logout/checkAuth (persisted to localStorage)
│   │   │   └── chatStore.ts       # Zustand: activeConversationId, isStreaming, streamingContent, pendingCitations
│   │   └── types/                 # TypeScript interfaces for auth, chat, knowledgeBase
│   ├── vite.config.ts             # Proxy /api→localhost:8000 (SSE buffering disabled), vitest jsdom config
│   ├── tsconfig.json              # Project references to tsconfig.app.json + tsconfig.node.json
│   └── .oxlintrc.json             # Oxlint: react/rules-of-hooks (error), react/only-export-components (warn)
│
├── scripts/
│   ├── seed_admin.py              # Creates admin user (admin/123456) if not exists
│   └── sample_products.csv        # 7 sample e-commerce products for KB testing
│
├── data/                          # Persistent runtime data (gitignored except .gitkeep files)
│   ├── app.db                     # SQLite database
│   ├── app.db-wal / app.db-shm   # SQLite WAL files
│   ├── uploads/                   # Uploaded documents (UUID-named)
│   ├── chroma/                    # Chroma vector store persistence
│   └── cache/llm_responses/       # Diskcache for LLM responses
│
├── logs/shopmind.log              # Rotating JSON log (10MB×5 files)
├── docker-compose.yml             # 3 services: backend (:8000), frontend (:3000), nginx (production profile)
├── Dockerfile.backend             # python:3.13-slim → uvicorn
├── Dockerfile.frontend            # node:22-alpine build → nginx:alpine
├── nginx.conf                     # Production reverse proxy (SSE buffering off, 300s timeout)
├── Makefile                       # dev-backend, dev-frontend, seed, docker-*, test, db-init
├── .env                           # Runtime config (API keys, model names, URLs — gitignored)
├── .env.example                   # Template for all config variables
└── README.md                      # Project documentation, quick start, architecture diagram
```

---

## Backend — All API Endpoints

### Auth (`/api/auth`)

| Method | Path | Auth | Status | Description |
|--------|------|------|--------|-------------|
| POST | `/api/auth/register` | None | 201 | Register new user → TokenResponse {access_token, user} |
| POST | `/api/auth/login` | None | 200 | Login → TokenResponse |
| GET | `/api/auth/me` | Bearer | 200 | Get current user profile → UserResponse |
| PUT | `/api/auth/change-password` | Bearer | 204 | Change password (old + new) |

### Q&A (`/api/qa`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/qa/ask` | Bearer | SSE streaming (`text/event-stream`). Events: `{"type":"token","content":"..."}`, `{"type":"citation","sources":[...]}`, `{"type":"done","message_id":...,"conversation_id":...}` |
| POST | `/api/qa/ask-sync` | Bearer | Synchronous. Returns `AnswerResponse` {answer, citations, message_id, conversation_id} |

### Conversations (`/api/conversations`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/conversations` | Bearer | List user's conversations (paginated, newest first). Query: `page`, `per_page` |
| POST | `/api/conversations` | Bearer | Create conversation → 201 ConversationResponse |
| GET | `/api/conversations/{id}` | Bearer | Get conversation with messages → ConversationDetailResponse |
| PUT | `/api/conversations/{id}` | Bearer | Update conversation title |
| DELETE | `/api/conversations/{id}` | Bearer | Delete conversation (cascade deletes messages) → 204 |

### Knowledge Base (`/api/kb`) — Admin Only

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/kb/documents` | Admin | Upload file (multipart). 202 → schedules background document processing |
| GET | `/api/kb/documents` | Admin | List documents. Query: `page`, `per_page`, `status`, `file_type` |
| GET | `/api/kb/documents/{id}` | Admin | Document detail with Chroma chunk previews |
| DELETE | `/api/kb/documents/{id}` | Admin | Delete document + file + Chroma vectors → 204 |
| PUT | `/api/kb/documents/{id}/reprocess` | Admin | Reset status → re-process in background |

### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check → {status:"ok", version, uptime_seconds} |
| GET | `/api/stats` | Admin | System stats: user_count, document_count, total_chunks, by-status breakdown |

---

## RAG Pipeline (the core flow)

`qa_service.ask_question_streaming()` — 9-step async generator:

1. **Resolve/create conversation** — finds existing or creates new with title "New Conversation"
2. **Save user message** — `INSERT INTO messages (role='user', content=question)`
3. **Load chat history** — last 20 messages, reversed chronologically, assistant messages truncated to 500 chars; formatted as "Human: …\nAssistant: …"
4. **Retrieve context** — MMR retriever (`k=8, fetch_k=20, lambda=0.7`), synchronous `retriever.invoke()` (blocks event loop — known bottleneck)
5. **Format context** — `[Source: filename]\n{page_content}\n---`
6. **Build and stream** — LCEL chain with system prompt, temp=0.1, `chain.astream()` yields tokens as SSE JSON lines
7. **Extract citations** — regex `\[Source:\s*(.+?)\](?:\s*,\s*Chunk:\s*(\d+))?`, enrich with 300-char chunk text from retrieved docs
8. **Save assistant message** — `INSERT INTO messages (role='assistant', content, citations_json, token_count)`
9. **Auto-title** — first message → set conversation title from truncated question
10. **Yield done event** → `{"type":"done","message_id":...,"conversation_id":...}`

Document processing (`document_processor.process_document()`):
- Runs as FastAPI `BackgroundTask` with its own DB session
- Loaders: PyPDF, Text, CSV, UnstructuredMarkdown, Docx2txt, UnstructuredHTML
- Splitter: `RecursiveCharacterTextSplitter` (chunk_size=1000, chunk_overlap=200, separators include "。" for Chinese)
- Embedding: SHA-256 cache check before Bailian API call (saves cost)
- Storage: `Chroma.aadd_documents()` with enriched metadata (document_id, filename, chunk_index, source_type)

---

## Configuration (.env)

Key variables (full list in `.env.example`):

| Variable | Default/Value | Notes |
|----------|--------------|-------|
| `SECRET_KEY` | dev key (change in prod) | JWT signing |
| `BAILIAN_API_KEY` | sk-ws-H... (real key) | Bailian API credential |
| `BAILIAN_LLM_MODEL` | qwen3.7-max | Overrides config default (qwen-max) |
| `BAILIAN_EMBEDDING_MODEL` | text-embedding-v2 | |
| `BAILIAN_BASE_URL` | ws-074c99f6gufx2ec0.cn-beijing.maas.aliyuncs.com/compatible-mode/v1 | OpenAI-compatible |
| `LLM_TEMPERATURE` | 0.1 | |
| `LLM_MAX_TOKENS` | 2048 | |
| `RETRIEVAL_K` | 8 | MMR final results |
| `RETRIEVAL_FETCH_K` | 20 | MMR candidate pool |
| `RETRIEVAL_LAMBDA_MULT` | 0.7 | Relevance vs diversity balance |
| `JWT_EXPIRE_MINUTES` | 480 | 8 hours |
| `BCRYPT_ROUNDS` | 12 | CPU-intensive — bottleneck under load |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | admin / 123456 | Seed script creates this |
| `RATE_LIMIT_ENABLED` | true | Set to false for stress testing |
| `CORS_ORIGINS` | ["http://localhost:5173"] | Vite dev server |
| `MAX_UPLOAD_SIZE_MB` | 50 | |
| `ALLOWED_FILE_TYPES` | ["pdf","txt","csv","md","docx","html"] | |

---

## Common Commands

### Development

```bash
# Backend (must be run from backend/ directory)
cd f:/LangChainRAG/backend
RATE_LIMIT_ENABLED=true ../.venv/Scripts/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd f:/LangChainRAG/frontend
npm run dev                              # → http://localhost:5173

# Or use startup scripts from project root:
bash start.sh                            # Linux/Mac/Git Bash
start.bat                                # Windows CMD

# Seed admin user
cd f:/LangChainRAG
.venv/Scripts/python scripts/seed_admin.py

# Seed KB with sample products (upload via admin UI at /admin/knowledge-base)
```

### Testing

```bash
# Backend unit tests
cd f:/LangChainRAG
.venv/Scripts/pytest backend/tests/ -v

# Frontend tests (no tests written yet, infrastructure is configured)
cd f:/LangChainRAG/frontend
npm test

# Stress testing (requires locust — not yet installed)
cd f:/LangChainRAG/backend/tests/stress
RATE_LIMIT_ENABLED=false ../../../.venv/Scripts/locust -f locustfile.py --host http://localhost:8000
```

### Docker

```bash
docker compose up -d                     # Dev: backend :8000, frontend :3000
docker compose --profile production up -d # Production: includes nginx reverse proxy
docker compose exec backend python scripts/seed_admin.py  # Seed inside container
```

---

## Development Workflow

### Adding a new API endpoint

1. Define Pydantic schemas in `backend/app/schemas/<module>.py`
2. Add service function in `backend/app/services/<module>_service.py`
3. Add route handler in `backend/app/api/<module>.py`
4. Register in `backend/app/main.py` if it's a new router: `app.include_router(router)`
5. Auth: inject `current_user = Depends(get_current_user)` or `Depends(require_admin)`
6. DB: inject `db: AsyncSession = Depends(get_db)`

### Adding a frontend page

1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/router.tsx` (wrap with `RequireAuth` if authenticated)
3. Add API functions in `frontend/src/api/`
4. Add TypeScript types in `frontend/src/types/`
5. If it needs server state, use TanStack Query (`useQuery` / `useMutation`)

### Auth flow

- JWT stored in `localStorage.token` (frontend) and sent as `Authorization: Bearer <token>`
- `AuthInitializer` (in `App.tsx`) calls `GET /api/auth/me` on mount to validate token
- `api/client.ts` Axios interceptor catches 401 → clears localStorage → redirects to `/login`
- Backend `get_current_user` dependency: decode JWT → query user by ID → verify `is_active`

---

## Key Design Decisions & Gotchas

### Known Bottlenecks (for production/stress testing)

1. **Rate limiter**: 200 req/min/IP default — must set `RATE_LIMIT_ENABLED=false` for any load test
2. **SQLite single-writer**: WAL mode helps read concurrency but writes still serialize. Connection pool is 5+10=15 max.
3. **bcrypt 12 rounds**: CPU-bound, blocks event loop on login/register. Consider bcrypt 4 for dev, or run in thread pool.
4. **Bailian API latency**: External LLM calls are 3–7s each. This dominates Q&A response time.
5. **Synchronous retriever**: `retriever.invoke()` inside async generator blocks the event loop. Should use `ainvoke()`.
6. **Single Uvicorn worker**: Dockerfile runs `uvicorn` without `--workers`. Use 4+ workers for concurrency.
7. **DB session held for entire SSE stream**: The `get_db` session stays open for the full SSE connection duration (can be minutes).

### Caching strategy

- **EmbeddingCache** (DB table): SHA-256 hash of text → skip Bailian Embedding API call. Saves cost but still writes to Chroma.
- **In-memory**: `query_embedding_cache` (LRU 1000), `document_list_cache` (TTL 30s, 256 entries)
- **Disk**: `llm_response_cache` (diskcache) for LLM responses — may be None if diskcache import fails
- **TanStack Query** (frontend): staleTime=30s, retry=1 — server-state caching for conversations, documents

### Citation format

LLM is instructed to output `[Source: filename]` or `[Source: filename, Chunk: N]`. Backend regex extracts these and enriches with actual chunk text. Frontend `CitationBadge` renders them as clickable tags with popover.

### File upload naming

Uploaded files get UUID prefix: `{uuid4_hex}_{sanitized_original_name}`. The original filename is preserved in the `documents.filename` DB column.

### Error handling

- Global handlers for `HTTPException` (pass-through with type marker), `RequestValidationError` (422 + detail), `Exception` (500, no leak)
- Services raise `HTTPException` directly for domain errors (409, 401, 403, 404, 413, 415)
- DB sessions auto-rollback on exception via `get_db` dependency
- Background task (`process_document`) catches all exceptions → sets `doc.status = "failed"` with truncated error
- Chroma errors caught silently in `kb_service` (Chroma unavailability won't crash the API)

---

## .claude/ Skills (project-specific)

Located in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `gitcommit` | Quality-gated commit: runs tester + quality-engineer agents, rejects if either fails |
| `run-app` | Start both backend (uvicorn :8000) and frontend (npm run dev :5173) |
| `rebuild-app` | Production build: compiles frontend, checks backend, builds Docker images |
| `unit-test` | Run pytest (backend) or vitest (frontend), generate test report |
| `security-audit` | Scan for hardcoded secrets, injection risks, config leaks |
| `comments-check` | Check code comments for coverage, accuracy, beginner-friendliness |

Agent definitions in `.claude/agents/`:
- `tester.md` — runs existing unit tests, returns VERDICT: PASS/FAIL
- `quality-engineer.md` — reviews code quality (security, comments, error handling, simplicity), returns VERDICT: PASS/FAIL

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend framework | FastAPI | 0.115+ |
| Server | Uvicorn | 0.32+ |
| LLM orchestration | LangChain | 0.3.20+ |
| Vector store | ChromaDB | 0.5+ |
| Database | SQLite via aiosqlite (async) | SQLAlchemy 2.0+ |
| LLM provider | Alibaba Bailian (Qwen) | OpenAI-compatible endpoint |
| Embedding model | text-embedding-v2 | |
| LLM model | qwen3.7-max | |
| Auth | python-jose (JWT HS256) + bcrypt (12 rounds) | |
| Rate limiting | SlowAPI | 0.1+ |
| Frontend framework | React | 19.2 |
| UI library | Ant Design | 6 |
| State management | Zustand (client), TanStack Query (server) | |
| Build tool | Vite | 8.1 |
| Language | TypeScript | 6.0 |
| Linter | Oxlint (Oxc) | 1.71 |
| Testing | pytest + pytest-asyncio, httpx, vitest + jsdom | |
