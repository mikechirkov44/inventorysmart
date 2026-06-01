#!/bin/bash

# ============================================
# InventorySmart - Настройка Nginx + SSL
# Опционально: нужен если хотите HTTPS
# или внешний reverse-proxy перед Docker
# ============================================

set -e

DOMAIN=${1:-""}

echo "========================================="
echo "  Настройка Nginx + SSL"
echo "========================================="
echo ""
echo "  Этот скрипт настраивает Nginx с SSL"
echo "  перед Docker-контейнером."
echo ""
echo "  Если HTTPS не нужен — приложение"
echo "  уже доступно на порту 80 через Docker."
echo ""

if [ -z "$DOMAIN" ]; then
  read -p "Домен (например example.com): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
  echo "Домен не указан. Отмена."
  exit 1
fi

# Установка Nginx
echo ""
echo "[1/4] Установка Nginx..."
sudo apt install -y nginx

# Установка Certbot
echo ""
echo "[2/4] Установка Certbot (Let's Encrypt)..."
sudo apt install -y certbot python3-certbot-nginx

# Конфигурация Nginx
echo ""
echo "[3/4] Настройка Nginx..."

sudo tee /etc/nginx/sites-available/inventorysmart > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/inventorysmart /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# SSL
echo ""
echo "[4/4] Получение SSL-сертификата..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || {
  echo ""
  echo "  Не удалось получить сертификат автоматически."
  echo "  Выполните вручную:"
  echo "    sudo certbot --nginx -d $DOMAIN"
}

echo ""
echo "========================================="
echo "  Готово!"
echo "========================================="
echo ""
echo "  HTTP:  http://$DOMAIN"
echo "  HTTPS: https://$DOMAIN"
echo ""
