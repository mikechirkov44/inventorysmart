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

# 4. Запрос пароля администратора
echo ""
echo "[4/6] Настройка администратора..."
ADMIN_USER="admin"
ADMIN_FULLNAME="Администратор"

# Проверяем, есть ли уже пользователи в БД (после запуска контейнеров)
# Пока просто запрашиваем пароль
echo ""
echo "  Создание учётной записи администратора."
echo "  Логин: $ADMIN_USER"
echo ""
read -sp "  Пароль администратора (мин. 6 символов): " ADMIN_PASSWORD
echo ""

if [ ${#ADMIN_PASSWORD} -lt 6 ]; then
  echo "  Ошибка: пароль должен быть не менее 6 символов."
  exit 1
fi

read -sp "  Повторите пароль: " ADMIN_PASSWORD_CONFIRM
echo ""

if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
  echo "  Ошибка: пароли не совпадают."
  exit 1
fi

# 5. Сборка и запуск контейнеров
echo ""
echo "[5/6] Сборка и запуск контейнеров..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 6. Ожидание готовности и создание администратора
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

# Проверяем, нужен ли setup
SETUP_REQUIRED=$(curl -sf http://localhost:3001/api/setup | grep -o '"setupRequired":true' || true)

if [ -n "$SETUP_REQUIRED" ]; then
  echo "  Создание администратора..."
  SETUP_RESULT=$(curl -sf -X POST http://localhost:3001/api/setup \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASSWORD\",\"fullName\":\"$ADMIN_FULLNAME\"}")

  if echo "$SETUP_RESULT" | grep -q "token"; then
    echo "  Администратор создан успешно."
  else
    echo "  Ошибка: $SETUP_RESULT"
    echo "  Аккаунт администратора не создан. Создайте его через веб-интерфейс."
  fi
else
  echo "  Администратор уже существует. Пропуск."
fi

IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "  Деплой завершён!"
echo "========================================="
echo ""
echo "  Приложение: http://$IP"
echo "  API:        http://$IP/api/health"
echo ""
echo "  Учётные данные:"
echo "    Логин:    $ADMIN_USER"
echo "    Пароль:   ********"
echo ""
echo "  Управление:"
echo "    docker compose ps          - статус"
echo "    docker compose logs -f     - логи"
echo "    docker compose restart     - перезапуск"
echo "    docker compose down        - остановка"
echo "    docker compose up -d       - запуск"
echo ""
