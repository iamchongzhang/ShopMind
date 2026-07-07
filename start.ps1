# ShopMind - One-Click Startup
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "      ShopMind - E-Commerce Q&A" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting servers..." -ForegroundColor White

Start-Process cmd -ArgumentList "/k cd /d $projectRoot && call .venv\Scripts\activate.bat && cd backend && uvicorn app.main:app --reload --port 8000"
Start-Sleep -Seconds 3
Start-Process cmd -ArgumentList "/k cd /d $projectRoot\frontend && npm run dev"

Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Docs:     http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Admin: admin / 123456" -ForegroundColor Yellow
Write-Host ""
Write-Host "Close the terminal windows to stop servers." -ForegroundColor Gray
