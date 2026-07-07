@echo off
title ShopMind - Starting...
cd /d "%~dp0"

echo ============================================
echo       ShopMind - E-Commerce Q&A
echo ============================================
echo.

:: Kill any existing server
echo Checking for existing servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Killing existing server on port 8000 (PID %%a^)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Start backend
start "ShopMind Backend" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate.bat && cd backend && uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

:: Start frontend
start "ShopMind Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo   Backend:  http://localhost:8000
echo   Docs:     http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo.
echo   Admin:   admin
echo   Password: 123456
echo.
echo Close the terminal windows to stop the servers.
echo ============================================
timeout /t 5 >nul
