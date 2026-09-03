#!/bin/bash
set -e

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 STRATEG-RUSSIA Deploy${NC}"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose не установлен${NC}"
    exit 1
fi

# Build
echo -e "${BLUE}📦 Building Docker image...${NC}"
docker-compose build --no-cache

# Stop old
echo -e "${BLUE}🛑 Stopping old containers...${NC}"
docker-compose down

# Start new
echo -e "${BLUE}▶️ Starting new containers...${NC}"
docker-compose up -d

# Health check
echo -e "${BLUE}🏥 Health check...${NC}"
sleep 5

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ HTTP API: OK (port 3000)${NC}"
else
    echo -e "${RED}❌ HTTP API: Failed (status $HTTP_STATUS)${NC}"
fi

if [ "$WS_STATUS" != "000" ]; then
    echo -e "${GREEN}✅ WebSocket: OK (port 8080)${NC}"
else
    echo -e "${RED}❌ WebSocket: Failed${NC}"
fi

echo -e "${GREEN}🎉 Deploy completed!${NC}"
echo -e "${BLUE}🌐 Web: http://localhost:3000${NC}"
echo -e "${BLUE}🔌 WebSocket: ws://localhost:8080${NC}"
echo -e "${BLUE}📊 Logs: docker-compose logs -f${NC}"