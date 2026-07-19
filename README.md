# ShopMind — AI Shopping Assistant for Fashion & Apparel

An enterprise-level Retrieval-Augmented Generation (RAG) system built with **LangChain** and **Alibaba Cloud Bailian (百炼)**. ShopMind helps clothing retailers answer customer questions about sizing, fabrics, fit, care, and styling — with cited sources, directly from your product catalog.

## Features

- **Size & Fit Recommendations** — Customers describe their build and measurements; ShopMind recommends the right size and fit from your size charts
- **Fabric & Care Guidance** — Answers questions about materials, washing instructions, shrinkage, and durability from your product specs
- **Product Comparisons** — Helps customers choose between items by comparing fabrics, fits, price, and warranty side-by-side
- **Returns & Shipping Policy** — Answers policy questions (return windows, exchange costs, free shipping thresholds) with citations
- **Style & Outfit Advice** — Suggests pairings and layering strategies using your catalog, plus general fashion knowledge
- **Multi-User & Multi-Session** — Each customer has independent conversations with persistent history
- **SSE Streaming** — Real-time token-by-token response streaming for a conversational feel
- **Enterprise Features** — Rate limiting, structured JSON logging, request tracing, embedding cache, input validation

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
3. Upload your clothing product documents — size charts, fabric spec sheets, care label guides, lookbooks
4. Monitor processing status in the document table
5. The system automatically chunks, embeds, and indexes your catalog for retrieval

### As Customer
1. Register an account or login
2. Start a new chat
3. Ask questions naturally — "I'm 5'11 and 185 lbs, what size oxford shirt should I get?" or "Can I machine wash the merino sweater?"
4. Click citation badges in responses to see the exact source document and chunk

### Sample Catalog

A 7-item clothing catalog is included for testing (`scripts/sample_products/`). Upload the individual CSV files via the admin UI for best results — each file becomes a separate document, which enables per-product retrieval evaluation.

| Product | Category | Price |
|---------|----------|-------|
| Men's Classic Oxford Shirt | Shirts | $59.99 |
| Women's High-Waist Straight Leg Jeans | Jeans | $79.99 |
| Unisex Lightweight Packable Puffer Jacket | Outerwear | $129.99 |
| Merino Wool V-Neck Sweater | Sweaters | $89.99 |
| Performance 5-Inch Running Shorts | Activewear | $44.99 |
| Linen-Blend Midi Dress | Dresses | $69.99 |
| Stretch Cotton Chinos | Pants | $64.99 |

Upload these CSV files via the admin UI to populate the knowledge base for testing. Each file becomes a separate document, enabling per-product retrieval evaluation.

## Architecture

```
FastAPI (Python)              React + Ant Design (TypeScript)
    │                                    │
    ├── SQLite (users, docs)             ├── Zustand (auth/chat state)
    ├── Chroma (vectors)                 ├── TanStack Query (server state)
    └── Bailian API (LLM/embeds)         └── Vite (build tool)
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
| Frontend | React 19 + TypeScript 6 + Vite 8 + Ant Design 6 |
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
├── scripts/           # Admin seed, sample catalog (7 per-product CSVs), RAG evaluation
├── docker-compose.yml
└── Makefile
```

## RAG Evaluation

The project includes a retrieval quality evaluation script that measures how well the system surfaces relevant products for clothing shopping questions:

```bash
# Evaluate retrieval quality (requires populated KB + Bailian API key)
python scripts/eval_rag.py              # Default k=8
python scripts/eval_rag.py --verbose    # Per-question details
python scripts/eval_rag.py --k 4 8 12   # Compare k values
```

The eval dataset (`scripts/eval_questions.json`) contains 15 realistic clothing shopping questions covering size recommendations, product comparisons, fabric care, returns, and style advice.

## License

Internal enterprise use.
