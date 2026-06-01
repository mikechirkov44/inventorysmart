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
echo "[1/5] Проверка Docker..."
if ! command -v docker &> /dev/null; then
  echo "Установка Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "Docker установлен. Может потребоваться перелогин."
fi
echo "Docker $(docker -v | cut -d' ' -f3 | tr -d ',')"

# 2. Установка Docker Compose
echo ""
echo "[2/5] Проверка Docker Compose..."
if ! docker compose version &> /dev/null; then
  echo "Установка Docker Compose plugin..."
  sudo apt update -y
  sudo apt install -y docker-compose-plugin
fi
echo "Docker Compose $(docker compose version --short)"

# 3. Клонирование / обновление репозитория
echo ""
echo "[3/5] Получение кода..."
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

# 4. Сборка и запуск контейнеров
echo ""
echo "[4/5] Сборка и запуск контейнеров..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 5. Ожидание готовности
echo ""
echo "[5/5] Проверка здоровья сервера..."
sleep 3
for i in 1 2 3 4 5; do
  if curl -sf http://localhost/api/health > /dev/null 2>&1; then
    break
  fi
  echo "  Ожидание... ($i/5)"
  sleep 2
done

IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "  Деплой завершён!"
echo "========================================="
echo ""
echo "  Приложение: http://$IP"
echo "  API:        http://$IP/api/health"
echo ""
echo "  Управление:"
echo "    docker compose ps          - статус"
echo "    docker compose logs -f     - логи"
echo "    docker compose restart     - перезапуск"
echo "    docker compose down        - остановка"
echo "    docker compose up -d       - запуск"
echo ""
