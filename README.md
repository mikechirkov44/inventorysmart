# InventorySmart - Система учёта оборудования и ЗИП

Система для учёта оборудования, планирования ремонтных работ, учёта запасных частей (ЗИП) и фиксации выполненных работ.

## Возможности

- **Оборудование** — справочник с фото, QR-кодами, привязкой к помещениям и списком работ
- **QR-сканер** — сканирование камерой устройства, отображение плановых работ на сегодня
- **Журнал работ** — фиксация выполненных работ с указанием мастера и комментариев
- **План-график** — план-график работ с Gantt-диаграммой
- **Справочник работ** — виды работ с периодичностью (ежедневно, еженедельно, ежемесячно и т.д.)
- **ЗИП (справочник)** — запасные части с артикулом, производителем, ед. измерения, остатками на складе
- **ЗИП (расход)** — привязка ЗИП к работам с указанием расхода на единицу работы
- **Приходные документы** — документы поступления ЗИП на склад (ПЗИП-YYYY-NNN) с автонумерацией
- **Автосписание** — при выполнении работ расход ЗИП подставляется автоматически, с возможностью изменения
- **Инциденты** — сообщения о поломках с workflow new → in_progress → resolved
- **Аналитика** — эффективность сотрудников, отчёт по остаткам ЗИП
- **Импорт** — импорт оборудования из Excel
- **Уведомления** — центр уведомлений, оповещения о предстоящих работах
- **Календарь** — месячный вид запланированных работ
- **Пользователи** — ролевая модель admin/user, JWT-аутентификация

## Технологии

| Компонент | Технология |
|-----------|-----------|
| Бэкенд | Node.js + Express 5 |
| Фронтенд | React 19 + React Router 7 + Vite 8 |
| База данных | PostgreSQL 16 |
| QR-коды | qrcode (генерация) + html5-qrcode (сканирование) |
| Excel | xlsx |
| UI-иконки | lucide-react |
| Деплой | Docker Compose (3 сервиса: db, server, client) |

## Установка

### Docker (рекомендуется)

```bash
docker-compose up -d
```

- Приложение: http://localhost
- API: http://localhost:3001/api
- База данных: localhost:5432

### Локальная разработка

1. Установите PostgreSQL и создайте базу `inventorysmart`

2. Установите зависимости:
```bash
npm install
cd client
npm install
```

3. Настройте переменную окружения:
```bash
export DATABASE_URL=postgresql://inventorysmart:inventorysmart_secret@localhost:5432/inventorysmart
```

4. Запустите:
```bash
# Backend
npm start

# Frontend (отдельный терминал)
cd client
npm run dev
```

5. Откройте http://localhost:5173, пройдите первый экран настройки для создания админа.

## Структура проекта

```
inventorysmart/
├── docker-compose.yml       # Оркестрация контейнеров
├── server/                  # Бэкенд
│   ├── db.js               # PostgreSQL пул + миграции
│   ├── index.js            # Express, подключение роутеров
│   ├── middleware/auth.js   # JWT-аутентификация
│   ├── models/             # Модели данных (SQL)
│   │   ├── user.js
│   │   ├── employee.js
│   │   ├── room.js
│   │   ├── equipment.js
│   │   ├── work.js
│   │   ├── workOrder.js
│   │   ├── sparePart.js
│   │   ├── sparePartReceipt.js
│   │   ├── incident.js
│   │   └── notification.js
│   ├── routes/             # API маршруты
│   │   ├── auth.js
│   │   ├── equipment.js
│   │   ├── works.js
│   │   ├── work-orders.js
│   │   ├── scan.js
│   │   ├── spareParts.js
│   │   ├── sparePartsReceipts.js
│   │   ├── incidents.js
│   │   ├── analytics.js
│   │   ├── calendar.js
│   │   ├── schedule.js
│   │   ├── import.js
│   │   ├── notifications.js
│   │   ├── rooms.js
│   │   ├── employees.js
│   │   ├── users.js
│   │   └── setup.js
│   ├── uploads/            # Загруженные файлы
│   └── Dockerfile
├── client/                 # Фронтенд
│   ├── src/
│   │   ├── pages/          # Страницы React (20 шт.)
│   │   ├── services/api.js # API-клиент (axios)
│   │   ├── components/     # Переиспользуемые компоненты
│   │   └── contexts/AuthContext.jsx
│   ├── vite.config.js
│   └── Dockerfile
└── start.ps1              # Скрипт запуска (Windows)
```

## API Endpoints

### Аутентификация
- `POST /api/auth/login` — вход в систему
- `GET /api/auth/me` — текущий пользователь
- `POST /api/setup` — первоначальная настройка админа

### Оборудование
- `GET /api/equipment` — список оборудования
- `GET /api/equipment/:id` — получить оборудование
- `POST /api/equipment` — создать оборудование
- `PUT /api/equipment/:id` — обновить оборудование
- `DELETE /api/equipment/:id` — удалить оборудование
- `GET /api/equipment/:id/qr` — QR-код оборудования

### Сканирование
- `GET /api/scan/:qrCode` — сканировать QR-код (возвращает оборудование + плановые работы с расходом ЗИП)
- `POST /api/scan/complete` — зафиксировать выполнение работы (принимает sparePartsUsed для автосписания)

### Работы (справочник)
- `GET /api/works` — список видов работ
- `POST /api/works` — создать вид работы
- `PUT /api/works/:id` — обновить вид работы
- `DELETE /api/works/:id` — удалить вид работы

### Заказ-наряды (журнал)
- `GET /api/work-orders` — список заказ-нарядов
- `GET /api/work-orders/:id` — получить заказ-наряд
- `POST /api/work-orders` — создать заказ-наряд
- `PUT /api/work-orders/:id` — обновить (с автосписанием ЗИП при переводе в completed)
- `DELETE /api/work-orders/:id` — удалить заказ-наряд

### ЗИП
- `GET /api/spare-parts` — список ЗИП (фильтр: ?equipmentId=)
- `GET /api/spare-parts/:id` — получить ЗИП со связями
- `POST /api/spare-parts` — создать позицию ЗИП
- `PUT /api/spare-parts/:id` — обновить позицию ЗИП
- `DELETE /api/spare-parts/:id` — удалить позицию ЗИП
- `POST /api/spare-parts/replenish` — пополнить склад (прямое инкрементирование)

### Приходные документы ЗИП
- `GET /api/spare-parts-receipts` — список документов
- `GET /api/spare-parts-receipts/:id` — получить документ с позициями
- `GET /api/spare-parts-receipts/next-number` — получить следующий номер (ПЗИП-YYYY-NNN)
- `POST /api/spare-parts-receipts` — создать документ (автоматически инкрементирует остатки)
- `DELETE /api/spare-parts-receipts/:id` — удалить документ (откатывает остатки)

### Инциденты
- `GET /api/incidents` — список инцидентов
- `POST /api/incidents` — сообщить о поломке
- `PUT /api/incidents/:id` — обновить статус/комментарий

### Уведомления
- `GET /api/notifications` — список уведомлений
- `GET /api/notifications/unread-count` — количество непрочитанных
- `PUT /api/notifications/:id/read` — отметить как прочитанное
- `PUT /api/notifications/read-all` — отметить все как прочитанные

### Аналитика
- `GET /api/analytics` — аналитика по сотрудникам
- `GET /api/analytics/summary` — сводка

### Календарь / План-график
- `GET /api/calendar?month=&year=` — события за месяц
- `GET /api/schedule` — план-график (фильтры: employeeId, groupBy)

### Справочники
- `GET/POST /api/rooms` — помещения
- `GET/POST /api/employees` — сотрудники
- `GET/POST /api/users` — пользователи (только admin)

### Импорт
- `POST /api/import/excel` — импорт из Excel
- `GET /api/import/template` — скачать шаблон

## Формат базы данных

### Основные таблицы

| Таблица | Описание |
|---------|----------|
| `users` | Пользователи (admin/user) |
| `employees` | Сотрудники |
| `rooms` | Помещения |
| `equipment` | Оборудование |
| `works` | Виды работ (справочник) |
| `equipment_works` | Связь оборудование ↔ работы |
| `work_orders` | Заказ-наряды (выполненные работы) |
| `spare_parts` | ЗИП (запасные части) |
| `spare_parts_equipment` | Связь ЗИП ↔ оборудование |
| `spare_parts_works` | Связь ЗИП ↔ работы (+ расход) |
| `spare_part_receipts` | Приходные документы ЗИП |
| `spare_part_receipt_items` | Позиции приходных документов |
| `incidents` | Инциденты (поломки) |
| `notifications` | Уведомления |

### Ключевые связи

- **Оборудование ↔ Работы**: M:N через `equipment_works` (какие работы применимы к оборудованию)
- **ЗИП ↔ Оборудование**: M:N через `spare_parts_equipment` (какие ЗИП подходят к оборудованию)
- **ЗИП ↔ Работы**: M:N через `spare_parts_works` с полем `quantity` (расход ЗИП на единицу работы)

## Миграция данных

При первом запуске сервера автоматически создаются все таблицы (`CREATE TABLE IF NOT EXISTS`) и добавляются новые колонки (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).

Для миграции данных из JSON-файлов (legacy):
```bash
node server/migrate-data.js
```
