#!/bin/bash
# ShopMind — One-Click Startup (macOS / Linux / Git Bash)

echo "╔══════════════════════════════════════════════╗"
echo "║           ShopMind — E-Commerce Q&A          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Starting backend and frontend servers..."
echo ""

# Start backend in background
cd "$(dirname "$0")/backend"
source ../.venv/bin/activate 2>/dev/null || source ../.venv/Scripts/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

sleep 3

# Start frontend
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:8000"
echo "Docs:     http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
echo ""
echo "Admin: admin / 123456"
echo ""
echo "Press Ctrl+C to stop all servers."

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
