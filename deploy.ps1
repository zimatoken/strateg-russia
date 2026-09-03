# deploy.ps1 - STRATEG-RUSSIA Deploy для Windows
$ErrorActionPreference = "Stop"

Write-Host "🚀 STRATEG-RUSSIA Deploy" -ForegroundColor Cyan

# Проверка Docker
try {
    docker --version | Out-Null
} catch {
    Write-Host "❌ Docker не установлен" -ForegroundColor Red
    exit 1
}

try {
    docker-compose --version | Out-Null
} catch {
    Write-Host "❌ Docker Compose не установлен" -ForegroundColor Red
    exit 1
}

# Build
Write-Host "📦 Building Docker image..." -ForegroundColor Cyan
docker-compose build --no-cache

# Stop old
Write-Host "🛑 Stopping old containers..." -ForegroundColor Cyan
docker-compose down

# Start new
Write-Host "▶️ Starting new containers..." -ForegroundColor Cyan
docker-compose up -d

# Health check
Write-Host "🏥 Health check..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

try {
    $httpResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 10
    if ($httpResponse.StatusCode -eq 200) {
        Write-Host "✅ HTTP API: OK (port 3000)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ HTTP API: Failed" -ForegroundColor Red
}

Write-Host "🎉 Deploy completed!" -ForegroundColor Green
Write-Host "🌐 Web: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 WebSocket: ws://localhost:8080" -ForegroundColor Cyan
Write-Host "📊 Logs: docker-compose logs -f" -ForegroundColor Cyan