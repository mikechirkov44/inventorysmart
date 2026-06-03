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
echo "[1/6] Проверка Docker..."
if ! command -v docker &> /dev/null; then
  echo "Установка Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "Docker установлен. Может потребоваться перелогин."
fi
echo "Docker $(docker -v | cut -d' ' -f3 | tr -d ',')"

# 2. Установка Docker Compose
echo ""
echo "[2/6] Проверка Docker Compose..."
if ! docker compose version &> /dev/null; then
  echo "Установка Docker Compose plugin..."
  sudo apt update -y
  sudo apt install -y docker-compose-plugin
fi
echo "Docker Compose $(docker compose version --short)"

# 3. Клонирование / обновление репозитория
echo ""
echo "[3/6] Получение кода..."
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

# 4. Запрос пароля суперадмина
echo ""
echo "[4/6] Настройка суперадмина..."

# Загружаем .env если существует
if [ -f .env ]; then
  set -a; source .env; set +a
fi

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

  # Создаём .env
  if [ ! -f .env ]; then
    cp .env.example .env
  fi

  # Записываем пароль в .env
  sed -i "s/^SUPERADMIN_PASSWORD=.*/SUPERADMIN_PASSWORD=$SA_PASSWORD_INPUT/" .env 2>/dev/null || \
    echo "SUPERADMIN_PASSWORD=$SA_PASSWORD_INPUT" >> .env

  echo "  Пароль суперадмина сохранён в .env"
else
  echo "  SUPERADMIN_PASSWORD задан через окружение."
fi

# 5. Сборка и запуск контейнеров
echo ""
echo "[5/6] Сборка и запуск контейнеров..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 6. Ожидание готовности
echo ""
echo "[6/6] Ожидание готовности сервера..."
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
