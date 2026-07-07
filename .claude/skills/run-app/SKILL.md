---
description: Start both ShopMind servers so you can test changes in the browser
argument-hint: "[optional: --docker to use Docker instead of local dev]"
allowed-tools: Bash(uvicorn *) Bash(npm *) Bash(docker *) Bash(taskkill *) Bash(netstat *)
---

Start the ShopMind application so you can interact with it in a web browser.

## Two modes

### Mode 1: Local Dev (default)

Kills any existing server on port 8000, then starts both backend and frontend:

```bash
# Kill existing server
for p in $(netstat -ano | grep ":8000" | grep "LISTENING" | awk '{print $5}'); do taskkill //F //PID $p 2>/dev/null; done

# Start backend
cd backend && uvicorn app.main:app --reload --port 8000

# Start frontend (in a new terminal)
cd frontend && npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs
- Admin: admin / 123456

### Mode 2: Docker

```bash
docker compose up -d
docker compose exec backend python -m scripts.seed_admin
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Common issues

| Problem | Fix |
|---------|-----|
| Port 8000 in use | `netstat -ano \| grep ":8000"` to find PID, then `taskkill //F //PID <pid>` |
| Module not found | Make sure venv is activated: `.venv\Scripts\activate` |
| Frontend proxy error | Backend must be running before you send API requests |
| Docker daemon not running | Start Docker Desktop first |
