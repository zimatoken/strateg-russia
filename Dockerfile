# ============================================
# STRATEG-RUSSIA: Multi-stage Docker Build
# ============================================

# -------- Stage 1: Client Build --------
FROM node:18-alpine AS client-builder
WORKDIR /app

# Копируем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходники
COPY . .
RUN npm run build

# -------- Stage 2: Production Image --------
FROM node:18-alpine AS production
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci --production

# Копируем собранный клиент
COPY --from=client-builder /app/dist ./dist

# Копируем сервер
COPY server ./server

# Порты
EXPOSE 3000 8080

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3000
ENV WS_PORT=8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

# Запуск через concurrently (оба процесса в foreground)
CMD ["npx", "concurrently", \
  "\"tsx server/http-server.ts\"", \
  "\"tsx server/coordinator.ts\"", \
  "--kill-others", \
  "--names", "HTTP,WS"]
