#!/bin/bash

# ============================================
# InventorySmart - Автоматический деплой на Ubuntu
# ============================================

set -e

REPO_URL="https://github.com/mikechirkov44/inventorysmart.git"
APP_DIR="/opt/inventorysmart"
NODE_VERSION="20"
PORT=3001

echo "========================================="
echo "  InventorySmart - Деплой на Ubuntu"
echo "========================================="

# 1. Обновление системы
echo ""
echo "[1/8] Обновление системы..."
sudo apt update -y
sudo apt upgrade -y

# 2. Установка зависимостей
echo ""
echo "[2/8] Установка зависимостей..."
sudo apt install -y curl git build-essential

# 3. Установка Node.js
echo ""
echo "[3/8] Установка Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "Node.js $(node -v) установлен"
echo "npm $(npm -v) установлен"

# 4. Установка PM2
echo ""
echo "[4/8] Установка PM2..."
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi
echo "PM2 установлен"

# 5. Клонирование репозитория
echo ""
echo "[5/8] Клонирование репозитория..."
if [ -d "$APP_DIR" ]; then
  echo "Директория $APP_DIR уже существует, обновляю..."
  cd "$APP_DIR"
  git pull
else
  sudo git clone "$REPO_URL" "$APP_DIR"
  sudo chown -R $USER:$USER "$APP_DIR"
  cd "$APP_DIR"
fi

# 6. Установка зависимостей проекта
echo ""
echo "[6/8] Установка зависимостей..."
npm install
cd client
npm install
cd ..

# 7. Сборка фронтенда
echo ""
echo "[7/8] Сборка фронтенда..."
cd client
npm run build
cd ..

# 8. Настройка и запуск PM2
echo ""
echo "[8/8] Настройка и запуск сервера..."

# Остановка старого процесса если есть
pm2 delete inventorysmart 2>/dev/null || true

# Запуск сервера
cd "$APP_DIR"
pm2 start server/index.js --name inventorysmart --env production
pm2 save
pm2 startup

echo ""
echo "========================================="
echo "  Деплой завершён!"
echo "========================================="
echo ""
echo "Сервер запущен на порту $PORT"
echo "API: http://$(hostname -I | awk '{print $1}'):$PORT/api/health"
echo ""
echo "Команды управления:"
echo "  pm2 status          - статус процессов"
echo "  pm2 logs            - логи"
echo "  pm2 restart all     - перезапуск"
echo "  pm2 stop all        - остановка"
echo "  pm2 delete all      - удаление процессов"
echo ""
