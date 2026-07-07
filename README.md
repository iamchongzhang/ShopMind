# ShopMind — AI-Powered Product Knowledge Assistant for E-Commerce

An enterprise-level Retrieval-Augmented Generation (RAG) system built with **LangChain** and **Alibaba Cloud Bailian (百炼)**. ShopMind helps e-commerce teams manage product information and answer customer questions with cited sources — all through a web browser.

## Features

- **Product Catalog Management** — Upload product specs, pricing sheets, manuals, and catalogs in PDF, TXT, CSV, Markdown, DOCX, HTML
- **RAG Q&A with Citations** — Ask product-related questions; answers cite specific catalog sources with clickable references
- **Multi-User & Multi-Session** — Each user has independent conversations with persistent history
- **Role-Based Access Control** — Admin manages product catalog; staff use Q&A to find product answers
- **SSE Streaming** — Real-time token-by-token response streaming
- **Enterprise Features** — Rate limiting, structured logging, request tracing, caching, input validation

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 22+
- Bailian (百炼) API credentials

### Setup

```bash
# 1. Clone and enter project
cd ShopMind

# 2. Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# 3. Configure environment
cp .env.example .env
# Edit .env and add your BAILIAN_API_KEY

# 4. Install dependencies
make install
# Or manually:
# pip install -r backend/requirements.txt
# cd frontend && npm install

# 5. Initialize database and create admin user
make seed
# Admin credentials: admin / 123456

# 6. Start development servers
make dev-backend   # Terminal 1 — FastAPI on :8000
make dev-frontend  # Terminal 2 — Vite on :5173
```

Open **http://localhost:5173** in your browser.

### Default Admin Account

| Username | Password |
|----------|----------|
| `admin`  | `123456` |

> **IMPORTANT:** Change the default admin password after first login!

## Usage

### As Admin
1. Login with admin credentials
2. Navigate to **Product Catalog** in the sidebar
3. Upload product documents (specs, pricing, manuals, catalogs)
4. Monitor processing status in the document table

### As User
1. Register a new account or login
2. Start a new chat
3. Ask questions about your products
4. View citations by clicking source badges in the responses

## Architecture

```
FastAPI (Python)          React + Ant Design (TypeScript)
    │                              │
    ├── SQLite (users, docs)       ├── Zustand (auth/chat state)
    ├── Chroma (vectors)           ├── TanStack Query (server state)
    └── Bailian API (LLM/embeds)   └── Vite (build tool)
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| API Framework | FastAPI 0.139+ |
| AI Framework | LangChain 0.3.x |
| LLM | Qwen series via Bailian |
| Embeddings | text-embedding-v2 via Bailian |
| Vector DB | Chroma |
| Relational DB | SQLite (aiosqlite) |
| Frontend | React 18 + TypeScript + Vite + Ant Design 5 |
| Auth | JWT (python-jose) + bcrypt |

## API Documentation

When the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up -d

# With production nginx reverse proxy
docker compose --profile production up -d
```

## Project Structure

```
ShopMind/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Database, security, RAG chain, LLM, caching
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── schemas/   # Pydantic request/response schemas
│   │   ├── services/  # Business logic
│   │   └── utils/     # File/text utilities
│   ├── tests/
│   └── requirements.txt
├── frontend/          # React frontend
│   ├── src/
│   │   ├── api/       # API client modules
│   │   ├── components/# UI components
│   │   ├── pages/     # Route pages
│   │   ├── store/     # Zustand stores
│   │   └── types/     # TypeScript types
│   └── package.json
├── data/              # Persistent data (SQLite, Chroma, uploads)
├── scripts/           # Admin seed script
├── docker-compose.yml
└── Makefile
```

## License

Internal enterprise use.
