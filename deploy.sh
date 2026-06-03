#!/bin/bash

# ============================================
# InventorySmart - Деплой на VPS (Docker)
# ============================================

set -e

REPO_URL="https://github.com/mikechirkov44/inventorysmart.git"
APP_DIR="/opt/inventorysmart"

echo "========================================="
echo "  InventorySmart - Деплой на VPS"
echo "========================================="

# 1. Установка Docker
echo ""
echo "[1/7] Проверка Docker..."
if ! command -v docker &> /dev/null; then
  echo "Установка Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "Docker установлен. Может потребоваться перелогин."
fi
echo "Docker $(docker -v | cut -d' ' -f3 | tr -d ',')"

# 2. Установка Docker Compose
echo ""
echo "[2/7] Проверка Docker Compose..."
if ! docker compose version &> /dev/null; then
  echo "Установка Docker Compose plugin..."
  sudo apt update -y
  sudo apt install -y docker-compose-plugin
fi
echo "Docker Compose $(docker compose version --short)"

# 3. Клонирование / обновление репозитория
echo ""
echo "[3/7] Получение кода..."
if [ -d "$APP_DIR" ]; then
  echo "Обновление существующей директории..."
  cd "$APP_DIR"
  git pull
else
  echo "Клонирование репозитория..."
  sudo git clone "$REPO_URL" "$APP_DIR"
  sudo chown -R $USER:$USER "$APP_DIR"
  cd "$APP_DIR"
fi

# 4. Настройка переменных окружения
echo ""
echo "[4/7] Настройка переменных окружения..."

# Загружаем .env если существует
if [ -f .env ]; then
  set -a; source .env; set +a
fi

# Создаём .env из примера
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Генерируем JWT_SECRET если не задан
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env 2>/dev/null || \
    echo "JWT_SECRET=$JWT_SECRET" >> .env
  echo "  JWT_SECRET сгенерирован и сохранён в .env"
fi

# Генерируем пароль БД если не задан
if [ -z "$POSTGRES_PASSWORD" ]; then
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env 2>/dev/null || \
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> .env
  echo "  POSTGRES_PASSWORD сгенерирован и сохранён в .env"
fi

# Устанавливаем остальные переменные по умолчанию
grep -q "^POSTGRES_DB=" .env 2>/dev/null || echo "POSTGRES_DB=inventorysmart" >> .env
grep -q "^POSTGRES_USER=" .env 2>/dev/null || echo "POSTGRES_USER=inventorysmart" >> .env

# 5. Запрос пароля суперадмина
echo ""
echo "[5/7] Настройка суперадмина..."

if [ -z "$SUPERADMIN_PASSWORD" ]; then
  echo ""
  echo "  Создание учётной записи суперадминистратора."
  echo "  Логин: superadmin"
  echo ""
  read -sp "  Пароль суперадмина (мин. 6 символов): " SA_PASSWORD_INPUT
  echo ""

  if [ ${#SA_PASSWORD_INPUT} -lt 6 ]; then
    echo "  Ошибка: пароль должен быть не менее 6 символов."
    exit 1
  fi

  read -sp "  Повторите пароль: " SA_PASSWORD_CONFIRM
  echo ""

  if [ "$SA_PASSWORD_INPUT" != "$SA_PASSWORD_CONFIRM" ]; then
    echo "  Ошибка: пароли не совпадают."
    exit 1
  fi

  sed -i "s/^SUPERADMIN_PASSWORD=.*/SUPERADMIN_PASSWORD=$SA_PASSWORD_INPUT/" .env 2>/dev/null || \
    echo "SUPERADMIN_PASSWORD=$SA_PASSWORD_INPUT" >> .env

  echo "  Пароль суперадмина сохранён в .env"
else
  echo "  SUPERADMIN_PASSWORD задан через окружение."
fi

# 6. Сборка и запуск контейнеров
echo ""
echo "[6/7] Сборка и запуск контейнеров..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 7. Ожидание готовности
echo ""
echo "[7/7] Ожидание готовности сервера..."
sleep 3

for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    break
  fi
  echo "  Ожидание сервера... ($i/10)"
  sleep 2
done

IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "  Деплой завершён!"
echo "========================================="
echo ""
echo "  Приложение:    http://$IP"
echo "  Панель админа: http://$IP/admin/"
echo "  API:           http://$IP/api/health"
echo ""
echo "  Суперадмин (панель /admin/):"
echo "    Логин: superadmin"
echo "    (пароль задан при деплое)"
echo ""
echo "  Админы порталов создаются через панель /admin/"
echo "  суперадминистратором."
echo ""
echo "  Управление:"
echo "    docker compose ps          - статус"
echo "    docker compose logs -f     - логи"
echo "    docker compose restart     - перезапуск"
echo "    docker compose down        - остановка"
echo "    docker compose up -d       - запуск"
echo ""
