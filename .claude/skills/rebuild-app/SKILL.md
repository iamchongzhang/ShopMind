---
description: Build ShopMind for production — compiles frontend, checks backend, builds Docker images
argument-hint: "[optional: --docker to build Docker images, or --check to just type-check]"
allowed-tools: Bash(npm *) Bash(pip *) Bash(docker *) Bash(python *)
---

Build the ShopMind application for production deployment.

## What it does

### Step 1: Backend check

```bash
cd backend && python -m pytest -v
```

### Step 2: Frontend build

```bash
cd frontend && npm run build
```

This runs TypeScript type-checking (`tsc -b`) and Vite production build. Output goes to `frontend/dist/`.

### Step 3: Docker build (if --docker)

```bash
docker compose build
```

Builds both backend and frontend Docker images. The frontend is served via nginx, the backend via uvicorn.

## Common issues

| Problem | Fix |
|---------|-----|
| TypeScript errors | Fix them first, then re-run. Check `tsc --noEmit` for details. |
| Tests fail | Fix failing tests before building for production. |
| Docker build fails | Check `.dockerignore` is not excluding needed files. |
| Out of disk space | `docker system prune -a` to clean old images. |

## After a successful build

- **Without Docker**: Serve `frontend/dist/` via nginx, run backend with `uvicorn app.main:app`
- **With Docker**: `docker compose up -d`
