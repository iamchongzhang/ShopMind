---
description: Write unit tests for backend (pytest) or frontend (vitest), run them, and generate a test report
argument-hint: "[file path or component name — leave empty to run all tests]"
allowed-tools: Bash(npx vitest *) Bash(npm test *) Bash(npm run test *) Bash(pytest *) Bash(.venv/Scripts/pytest *) Bash(.venv/Scripts/python -m pytest *) Read(*) Glob(*) Grep(*) Write(*) Edit(*)
---

Write unit tests, execute them, and report the results.

## Project Context

ShopMind has two test suites:

| Layer | Framework | Command | Test location |
|-------|-----------|---------|---------------|
| **Backend** (FastAPI + LangChain) | pytest + httpx | `cd backend && ../.venv/Scripts/python -m pytest -v` | `backend/tests/` |
| **Frontend** (React + TypeScript) | Vitest + React Testing Library | `cd frontend && npm test` | Next to source in `*.test.ts(x)` |

## Three modes

### Mode 1: Create tests (when user provides a file path)

**Step 1 — Determine which layer.** Read the target file.
- If it's in `backend/` → write a **pytest** file
- If it's in `frontend/src/` → write a **Vitest** file

**Step 2 — Read and understand the code.** Read the target file. Understand what it exports, what its dependencies are, and what edge cases exist.

**Step 3 — Write the test file.**

---

### Backend test patterns (pytest + httpx)

Test files go in `backend/tests/`. Name them after the module: `test_auth.py`, `test_kb.py`, `test_qa.py`, `test_conversations.py`.

**Testing an API endpoint:**

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Should create a new user and return a JWT token."""
    response = await client.post("/api/auth/register", json={
        "username": "testuser",
        "password": "test123456",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "testuser"
    assert data["user"]["role"] == "user"

@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    """Should return 409 when username is taken."""
    # First registration
    await client.post("/api/auth/register", json={
        "username": "dupe", "password": "test123456",
    })
    # Duplicate
    response = await client.post("/api/auth/register", json={
        "username": "dupe", "password": "test123456",
    })
    assert response.status_code == 409
```

**Testing with authentication:**

```python
@pytest.mark.asyncio
async def test_get_me_requires_auth(client: AsyncClient):
    """Should reject unauthenticated requests."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 401  # or 403

@pytest.mark.asyncio
async def test_get_me_with_token(client: AsyncClient):
    """Should return the authenticated user's profile."""
    # Login to get token
    login_resp = await client.post("/api/auth/login", json={
        "username": "admin", "password": "123456",
    })
    token = login_resp.json()["access_token"]

    # Use token
    response = await client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}",
    })
    assert response.status_code == 200
    assert response.json()["username"] == "admin"
```

**Testing services directly (with DB session):**

```python
@pytest.mark.asyncio
async def test_hash_and_verify_password():
    """Password hashing should round-trip correctly."""
    from app.core.security import hash_password, verify_password

    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed)
    assert not verify_password("wrongpassword", hashed)
```

**Testing the RAG chain (without LLM call):**

```python
@pytest.mark.asyncio
async def test_format_docs():
    """Should format documents with source markers."""
    from app.core.rag_chain import format_docs
    from langchain_core.documents import Document

    docs = [
        Document(page_content="Product X has a 2-year warranty", metadata={
            "filename": "products.pdf", "chunk_index": 0,
        }),
    ]
    result = format_docs(docs)
    assert "[Source: products.pdf, Chunk: 0]" in result
    assert "2-year warranty" in result
```

---

### Frontend test patterns (Vitest + React Testing Library)

Test files go next to the component. Example: `LoginForm.tsx` → `LoginForm.test.tsx`.

**Testing a pure function:**

```typescript
import { describe, it, expect } from 'vitest'
import { cleanQuestion } from './text_utils'

describe('cleanQuestion', () => {
  it('should strip HTML tags', () => {
    expect(cleanQuestion('<b>hello</b>')).toBe('hello')
  })

  it('should normalize whitespace', () => {
    expect(cleanQuestion('  hello   world  ')).toBe('hello world')
  })

  it('should handle empty input', () => {
    expect(cleanQuestion('')).toBe('')
  })
})
```

**Testing a React component:**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from './LoginForm'

// Mock the auth store
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = { login: vi.fn() }
    return selector ? selector(state) : state
  }),
}))

describe('LoginForm', () => {
  it('should render username and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByText('ShopMind')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/please enter your username/i)).toBeInTheDocument()
  })
})
```

**Rules for writing good tests:**
- Test the happy path (normal usage)
- Test edge cases (empty input, very large input, null/undefined, duplicate)
- Test error handling (what happens when something fails?)
- Test auth guards (admin-only endpoints reject regular users)
- For components: test what the user sees and interacts with, not React internals
- Each `it()` block tests ONE thing — keep them focused
- Use descriptive names: `it('should return 409 when username already exists')` not `it('test 1')`
- **Mock external APIs** (Bailian LLM, embeddings) — never call real APIs in tests
- The `client` fixture in conftest.py already provides an isolated test DB — use it

---

### Mode 2: Run tests (always do this after writing tests)

**Backend:**
```bash
cd f:/LangChainRAG/backend && ../.venv/Scripts/python -m pytest -v
```

To run a specific test file:
```bash
cd f:/LangChainRAG/backend && ../.venv/Scripts/python -m pytest -v tests/test_auth.py
```

To run a specific test function:
```bash
cd f:/LangChainRAG/backend && ../.venv/Scripts/python -m pytest -v tests/test_auth.py::test_register_user
```

**Frontend:**
```bash
cd f:/LangChainRAG/frontend && npm test
```

To run a specific file:
```bash
cd f:/LangChainRAG/frontend && npx vitest run src/components/Auth/LoginForm.test.tsx
```

**Run both:**
```bash
cd f:/LangChainRAG/backend && ../.venv/Scripts/python -m pytest -v
cd f:/LangChainRAG/frontend && npm test
```

---

### Mode 3: Generate report (always do this after running)

After tests finish, summarize:

```
📊 ShopMind Test Report
══════════════════════════════════════
Backend (pytest)
──────────────────────────────────────
✅ Passed: 8
❌ Failed: 0
⏭️  Skipped: 0
⏱️  Time: 2.1s
──────────────────────────────────────
Frontend (vitest)
──────────────────────────────────────
✅ Passed: 4
❌ Failed: 0
⏭️  Skipped: 0
⏱️  Time: 1.4s
══════════════════════════════════════
✅ All tests passing!
```

If there are failures, list each failing test with its full error message and suggest what might be wrong. Do NOT guess at fixes without reading the code.

---

## If the user provides no arguments

Run all tests from both layers:

```bash
cd f:/LangChainRAG/backend && ../.venv/Scripts/python -m pytest -v
cd f:/LangChainRAG/frontend && npm test
```

Then show the combined report. If no test files exist yet, suggest starting with:
- `backend/tests/test_auth.py` — authentication endpoints
- `backend/tests/test_kb.py` — product catalog management
- `backend/tests/test_qa.py` — RAG pipeline and Q&A
- `frontend/src/components/Auth/LoginForm.test.tsx` — login form

---

## Important notes

- **Backend tests** use `pytest.fixture("client")` from `conftest.py` — an async HTTP client with an isolated in-memory SQLite database
- **Never call real Bailian APIs** in tests — the LLM and embedding APIs cost money and are slow
- **Mock the RAG chain** when testing Q&A endpoints — use `unittest.mock` or `pytest.monkeypatch`
- **Frontend tests** use `jsdom` environment — they simulate a browser but don't run a real one
- **Ant Design** components render with specific ARIA roles — use `screen.getByRole()` to find them
- **Zustand stores** should be mocked in component tests — test the store logic separately
- Test files in `backend/tests/` are named `test_*.py`
- Test files in `frontend/src/` are named `*.test.ts` or `*.test.tsx` and go next to the source file
