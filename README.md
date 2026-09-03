# STRATEG — Платформа P2P для бизнеса (STRATEG-RUSSIA)

Коротко: P2P-мессенджер и бизнес-инструменты (сделки, бартер, планы) с локальным хранилищем и синхронизацией между устройствами.

## Технологии
- React + TypeScript
- Vite
- WebRTC (P2P транспорт)
- IndexedDB + localStorage

## Быстрый старт
Установка и запуск в режиме разработки:
```bash
npm install
npm run dev
```

Сборка для продакшена:
```bash
npm run build
```

## Деплой
Проект можно разместить на GitHub Pages. Пример: https://zimatoken.github.io/strateg-russia/ (при наличии настроенного workflow).

## Основные файлы и директории
- `src/core/` — ядро: `dialogCore.ts`, `dataStore.ts`, `db.ts`, `p2p.ts` и пр.
- `src/components/` — UI компоненты
- `src/pages/` — страницы приложения (`DealsPage`, `BarterPage`, `ChatsPage`)
- `src/hooks/` — хуки (`useDialogCore`, `useDataStore`, `useToast`)

## Ключевые возможности
- P2P-синхронизация данных между устройствами (`DATA_SYNC`)
- Локальное хранилище приложений (DataStore)
- Контекстные чаты, связанные с сделками и бартерами

## Отладка и тестирование
- Запуск сборки: `npm run build`
- Локальная разработка: `npm run dev`

## Контакты
Если проект развернут на GitHub Pages — проверьте актуальную ссылку в `package.json` или CI.

---

Автор и поддержка: команда STRATEG
