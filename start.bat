@echo off
echo 🧊 STRATEG-RUSSIA Final - Запуск объединенного мессенджера
echo.

echo Запуск WebSocket сервера...
start cmd /k "node server/coordinator.js"

timeout /t 2 /nobreak > nul

echo Запуск React клиента...
start cmd /k "npm run dev"

echo.
echo ✅ Сервер запущен на ws://localhost:8080
echo ✅ Клиент будет доступен на http://localhost:5173
echo.
echo Для тестирования откройте браузер и перейдите на http://localhost:5173
echo.
pause

