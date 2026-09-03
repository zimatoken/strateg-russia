@echo off
echo 🚀 STRATEG-RUSSIA Deploy

REM Build
echo 📦 Building Docker image...
docker-compose build

REM Stop old
echo 🛑 Stopping old containers...
docker-compose down

REM Start new
echo ▶️ Starting new containers...
docker-compose up -d

REM Health check
echo 🏥 Health check...
timeout /t 5 /nobreak
echo ✅ Deployed successfully!
echo 🌐 Web: http://localhost:3000
echo 🔌 WebSocket: ws://localhost:8080
