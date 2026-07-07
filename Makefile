.PHONY: dev-backend dev-frontend seed install setup test

# ── Development ─────────────────────────────────────────────────
# ── One-click start ──────────────────────────────────────────────
start:
	@echo Starting ShopMind...
	@start "" cmd /c "start.bat"

dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

seed:
	cd backend && python -m scripts.seed_admin

# ── Setup ───────────────────────────────────────────────────────
install:
	pip install -r backend/requirements.txt
	cd frontend && npm install

setup: install seed
	@echo "============================================"
	@echo "Setup complete!"
	@echo "Run 'make dev-backend' and 'make dev-frontend'"
	@echo "Admin login: admin / 123456"
	@echo "============================================"

# ── Docker ──────────────────────────────────────────────────────
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-seed:
	docker compose exec backend python -m scripts.seed_admin

docker-setup: docker-build docker-up docker-seed
	@echo "============================================"
	@echo "Docker setup complete!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8000"
	@echo "Admin: admin / 123456"
	@echo "============================================"

# ── Testing ─────────────────────────────────────────────────────
test:
	cd backend && pytest -v
	cd frontend && npm test

# ── Database ────────────────────────────────────────────────────
db-init:
	cd backend && alembic upgrade head

db-migrate:
	cd backend && alembic revision --autogenerate
	cd backend && alembic upgrade head
