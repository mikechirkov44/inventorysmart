#!/bin/bash

# ============================================
# Настройка Nginx для InventorySmart
# ============================================

set -e

echo "========================================="
echo "  Настройка Nginx"
echo "========================================="

# Установка Nginx
echo ""
echo "[1/3] Установка Nginx..."
sudo apt install -y nginx

# Копирование конфигурации
echo ""
echo "[2/3] Копирование конфигурации..."
sudo cp nginx.conf /etc/nginx/sites-available/inventorysmart
sudo ln -sf /etc/nginx/sites-available/inventorysmart /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверка и перезапуск
echo ""
echo "[3/3] Проверка и перезапуск Nginx..."
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "========================================="
echo "  Nginx настроен!"
echo "========================================="
echo ""
echo "Сайт доступен по адресу: http://$(hostname -I | awk '{print $1}')"
echo ""
