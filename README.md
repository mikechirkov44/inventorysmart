# InventorySmart - Система учёта оборудования и ЗИП

Система для учёта оборудования, планирования ремонтных работ, учёта запасных частей (ЗИП) и фиксации выполненных работ. Мульти-тенантная архитектура с панелью суперадминистратора.

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
- **Пользователи** — ролевая модель admin/user, JWT-аутентификация, привязка к порталу
- **Мульти-тенантность** — несколько компаний (порталов), каждая со своими пользователями
- **Панель суперадмина** — управление компаниями, пользователями и лицензиями

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

## Быстрый старт (Docker)

### Автоматический деплой на VPS

```bash
# Клонируйте репозиторий
git clone https://github.com/mikechirkov44/inventorysmart.git
cd inventorysmart

# Запустите скрипт деплоя
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
1. Установит Docker и Docker Compose
2. Запросит пароль суперадминистратора
3. Сгенерирует JWT_SECRET и пароль БД
4. Соберёт и запустит контейнеры

### Ручной запуск

```bash
# 1. Скопируйте и заполните .env
cp .env.example .env
# Отредактируйте .env — заполните все обязательные переменные

# 2. Запустите
docker compose up -d
```

### Переменные окружения (.env)

| Переменная | Обязательна | Описание |
|------------|:-----------:|----------|
| `POSTGRES_DB` | Да | Имя базы данных |
| `POSTGRES_USER` | Да | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | Да | Пароль PostgreSQL |
| `JWT_SECRET` | Да | Секретный ключ JWT (мин. 32 символа) |
| `SUPERADMIN_USERNAME` | Нет | Логин суперадмина (по умолчанию: `superadmin`) |
| `SUPERADMIN_PASSWORD` | Да | Пароль суперадмина |
| `APP_PORT` | Нет | Порт приложения (по умолчанию: `80`) |
| `DB_PORT` | Нет | Порт PostgreSQL (по умолчанию: `5433`) |

### После запуска

| Сервис | URL |
|--------|-----|
| Приложение | http://localhost |
| Панель суперадмина | http://localhost/admin/ |
| API | http://localhost/api/health |

## Управление

```bash
docker compose ps          # статус контейнеров
docker compose logs -f     # логи в реальном времени
docker compose restart     # перезапуск
docker compose down        # остановка
docker compose up -d       # запуск
docker compose up -d --build  # пересборка и запуск
```

## CI/CD (GitHub Actions)

Автоматический деплой при пуше в `main` ветку.

### Настройка

1. **Создайте SSH-ключ для деплоя:**
```bash
# На локальном компьютере
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy
# Скопируйте публичный ключ на VPS
ssh-copy-id -i ~/.ssh/github_deploy.pub root@YOUR_VPS_IP
```

2. **Добавьте secrets в GitHub:**
   - Перейдите в репозиторий → **Settings** → **Secrets and variables** → **Actions**
   - Добавьте:
     - `VPS_HOST` — IP-адрес сервера
     - `VPS_USER` — SSH пользователь (обычно `root`)
     - `VPS_SSH_KEY` — Содержимое приватного ключа (`cat ~/.ssh/github_deploy`)

3. **Убедитесь что .env существует на VPS:**
```bash
# На VPS第一次 запустите deploy.sh для создания .env
cd /opt/inventorysmart
./deploy.sh
```

### Как работает

```
git push origin main
       ↓
GitHub Actions → SSH → VPS
       ↓
git pull → docker compose down → docker compose up -d --build
       ↓
Health check: curl localhost:3001/api/health
       ↓
✅ Деплой завершён
```

### Ручной запуск

В GitHub: **Actions** → **Deploy to Production** → **Run workflow**

## Панель суперадминистратора

Доступна по адресу `/admin/`. Суперадминистратор управляет:

1. **Компаниями** — создание порталов для организаций
2. **Пользователями** — назначение пользователей на конкретные порталы
3. **Лицензиями** — генерация лицензионных ключей (план + срок действия)

Админы порталов создаются через панель суперадмина и привязываются к конкретной компании.

## Локальная разработка

### Windows

```powershell
# Запустите все сервисы (backend + frontend + admin)
.\start.ps1
```

- Основное приложение: http://localhost:5173
- Панель суперадмина: http://localhost:5174
- API сервер: http://localhost:3001

### Linux/macOS

```bash
# Терминал 1: Backend
npm start

# Терминал 2: Frontend
cd client && npm run dev

# Терминал 3: Admin panel
cd client-admin && npm run dev
```

## Структура проекта

```
inventorysmart/
├── docker-compose.yml          # Оркестрация: db, server, client
├── deploy.sh                   # Скрипт деплоя на VPS
├── .env.example                # Пример переменных окружения
│
├── server/                     # Бэкенд (Node.js + Express)
│   ├── index.js               # Точка входа, настройка маршрутов
│   ├── db.js                  # PostgreSQL пул + миграции
│   ├── middleware/
│   │   └── auth.js            # JWT-аутентификация + проверка прав
│   ├── models/                # Модели данных (13 файлов)
│   ├── routes/                # API маршруты (20 файлов)
│   ├── utils/
│   │   ├── upload.js          # Общая конфигурация загрузки файлов
│   │   └── schedule.js        # Утилиты расчёта графика
│   └── Dockerfile
│
├── client/                     # Основное приложение (React SPA)
│   ├── src/
│   │   ├── App.jsx            # Маршрутизация + навигация
│   │   ├── App.css            # Стили (~5000 строк)
│   │   ├── pages/             # Страницы (21 файл)
│   │   ├── components/        # Переиспользуемые компоненты (8 файлов)
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # Контекст аутентификации
│   │   └── services/
│   │       └── api.js         # API-клиент (axios)
│   ├── nginx.conf             # Конфигурация nginx для продакшена
│   └── Dockerfile             # Многоэтапная сборка (client + admin)
│
└── client-admin/               # Панель суперадмина (отдельная SPA)
    └── src/
        ├── SuperAdminPage.jsx # Управление компаниями/пользователями/лицензиями
        └── api.js             # API-клиент суперадмина
```

## API Endpoints

### Аутентификация
- `POST /api/auth/login` — вход (возвращает JWT + права)
- `GET /api/auth/me` — текущий пользователь с правами
- `POST /api/setup` — первоначальная настройка (только если нет пользователей)

### Оборудование
- `GET /api/equipment` — список оборудования
- `GET /api/equipment/:id` — получить оборудование
- `POST /api/equipment` — создать (с фото)
- `PUT /api/equipment/:id` — обновить
- `DELETE /api/equipment/:id` — удалить
- `GET /api/equipment/:id/qr` — QR-код (PNG)

### Сканирование
- `GET /api/scan/:qrCode` — сканировать QR (оборудование + плановые работы + расход ЗИП)
- `POST /api/scan/complete` — выполнить работу (автосписание ЗИП)

### Работы (справочник)
- `GET /api/works` — список видов работ
- `POST /api/works` — создать
- `PUT /api/works/:id` — обновить
- `DELETE /api/works/:id` — удалить

### Заказ-наряды (журнал)
- `GET /api/work-orders` — список
- `GET /api/work-orders/:id` — получить
- `POST /api/work-orders` — создать (с фото)
- `PUT /api/work-orders/:id` — обновить (автосписание при completed)
- `DELETE /api/work-orders/:id` — удалить

### ЗИП
- `GET /api/spare-parts` — список (фильтр: `?equipmentId=`)
- `GET /api/spare-parts/:id` — получить со связями
- `POST /api/spare-parts` — создать
- `PUT /api/spare-parts/:id` — обновить
- `DELETE /api/spare-parts/:id` — удалить
- `POST /api/spare-parts/replenish` — пополнить склад

### Приходные документы ЗИП
- `GET /api/spare-parts-receipts` — список
- `GET /api/spare-parts-receipts/:id` — получить с позициями
- `GET /api/spare-parts-receipts/next-number` — следующий номер (ПЗИП-YYYY-NNN)
- `POST /api/spare-parts-receipts` — создать (автоинкремент остатков)
- `DELETE /api/spare-parts-receipts/:id` — удалить (откат остатков)

### Инциденты
- `GET /api/incidents` — список
- `POST /api/incidents` — сообщить о поломке (с фото)
- `PUT /api/incidents/:id` — обновить статус

### Уведомления
- `GET /api/notifications` — список
- `GET /api/notifications/unread-count` — количество непрочитанных
- `PUT /api/notifications/:id/read` — отметить прочитанным
- `PUT /api/notifications/read-all` — отметить все

### Аналитика
- `GET /api/analytics` — эффективность сотрудников
- `GET /api/analytics/summary` — сводка

### Календарь / План-график
- `GET /api/calendar?month=&year=` — события за месяц
- `GET /api/schedule` — план-график (фильтры: `employeeId`, `groupBy`)

### Справочники
- `GET/POST /api/rooms` — помещения
- `GET/POST /api/employees` — сотрудники
- `GET/POST /api/users` — пользователи
- `GET/POST /api/positions` — должности

### Компания и лицензии
- `GET /api/company` — настройки компании
- `PUT /api/company` — обновить настройки

### Суперадмин
- `POST /api/superadmin/login` — вход суперадмина
- `GET /api/superadmin/companies` — список компаний
- `POST /api/superadmin/companies` — создать компанию
- `GET /api/superadmin/users` — список пользователей
- `POST /api/superadmin/users` — создать пользователя для компании
- `POST /api/superadmin/generate-license` — сгенерировать лицензию

### Импорт
- `POST /api/import/excel` — импорт из Excel
- `GET /api/import/template` — скачать шаблон

## Структура базы данных

### Основные таблицы

| Таблица | Описание |
|---------|----------|
| `users` | Пользователи (роли: superadmin, admin, user) |
| `employees` | Сотрудники |
| `rooms` | Помещения |
| `equipment` | Оборудование |
| `works` | Виды работ (справочник) |
| `equipment_works` | Связь оборудование ↔ работы (M:N) |
| `work_orders` | Заказ-наряды (выполненные работы) |
| `spare_parts` | ЗИП (запасные части) |
| `spare_parts_equipment` | Связь ЗИП ↔ оборудование (M:N) |
| `spare_parts_works` | Связь ЗИП ↔ работы + расход (M:N) |
| `spare_part_receipts` | Приходные документы ЗИП |
| `spare_part_receipt_items` | Позиции приходных документов |
| `incidents` | Инциденты (поломки) |
| `notifications` | Уведомления |
| `positions` | Должности с JSON-правами доступа |
| `company_settings` | Настройки компании + лицензия |

### Ключевые связи

- **Оборудование ↔ Работы**: M:N через `equipment_works`
- **ЗИП ↔ Оборудование**: M:N через `spare_parts_equipment`
- **ЗИП ↔ Работы**: M:N через `spare_parts_works` (поле `quantity` — расход на единицу)

## Миграция данных

При первом запуске сервера автоматически создаются все таблицы и добавляются новые колонки.

Для миграции данных из JSON-файлов (legacy):
```bash
node server/migrate-data.js
```

## Лицензирование

Лицензионный ключ генерируется суперадмином через панель `/admin/`. Ключ содержит:
- План (DEMO, BASIC, PRO, etc.)
- Дату окончания
- ID компании

Ключ передаётся клиенту и вводится в настройках_portalа.
