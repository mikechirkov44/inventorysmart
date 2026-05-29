# InventorySmart - Система учета оборудования

Система для учета оборудования, планирования и фиксации ремонтных работ.

## Возможности

- Справочник оборудования с фото, QR-кодами и перечнем работ
- Генерация уникальных QR-кодов для каждого оборудования
- Сканирование QR-кодов через камеру устройства
- Фиксация выполненных работ мастером
- Импорт справочника из Excel
- Журнал выполненных работ

## Технологии

- **Бэкенд**: Node.js + Express
- **Фронтенд**: React + Vite
- **База данных**: JSON-файлы
- **QR-коды**: qrcode, html5-qrcode
- **Excel**: xlsx

## Установка

1. Установите зависимости:
```bash
npm install
cd client
npm install
```

2. Запустите приложение:
```bash
# Windows
.\start.ps1

# Или вручную:
# Терминал 1 - Backend:
npm start

# Терминал 2 - Frontend:
cd client
npm run dev
```

3. Откройте в браузере:
- Фронтенд: http://localhost:5173
- API: http://localhost:3001/api

## Структура проекта

```
inventorysmart/
├── server/                 # Бэкенд
│   ├── data/              # JSON-файлы данных
│   ├── uploads/           # Загруженные файлы
│   ├── routes/            # API маршруты
│   ├── models/            # Модели данных
│   └── index.js           # Точка входа
├── client/                # Фронтенд
│   └── src/
│       ├── pages/         # Страницы React
│       ├── services/      # API сервисы
│       └── components/    # Компоненты
└── start.ps1             # Скрипт запуска
```

## API Endpoints

### Оборудование
- `GET /api/equipment` - список оборудования
- `GET /api/equipment/:id` - получить оборудование
- `POST /api/equipment` - создать оборудование
- `PUT /api/equipment/:id` - обновить оборудование
- `DELETE /api/equipment/:id` - удалить оборудование
- `GET /api/equipment/:id/qr` - получить QR-код

### Сканирование
- `GET /api/scan/:qrCode` - сканировать QR-код
- `POST /api/scan/complete` - зафиксировать выполнение работы

### Работы
- `GET /api/work-orders` - список работ
- `GET /api/work-orders/:id` - получить работу
- `POST /api/work-orders` - создать работу
- `PUT /api/work-orders/:id` - обновить работу
- `DELETE /api/work-orders/:id` - удалить работу

### Импорт
- `POST /api/import/excel` - импорт из Excel
- `GET /api/import/template` - скачать шаблон

## Формат Excel для импорта

| Наименование | Инвентарный номер | Описание | Расположение | Категория | Работы |
|--------------|-------------------|----------|--------------|-----------|--------|
| Насос | INV-001 | Описание | Цех №1 | Насосы | Замена масла, Проверка |
