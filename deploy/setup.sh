#!/bin/bash
set -euo pipefail

# One-time server setup script — run on the droplet
# Usage: sudo bash setup.sh

APP_DIR="/opt/otris"

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs nginx

echo "==> Creating otris user..."
useradd --system --no-create-home --shell /bin/false otris || true

echo "==> Setting up app directory..."
mkdir -p "$APP_DIR"
chown otris:otris "$APP_DIR"

echo "==> Installing systemd service..."
cp /tmp/otris.service /etc/systemd/system/otris.service
systemctl daemon-reload
systemctl enable otris

echo "==> Installing nginx config..."
cp /tmp/nginx.conf /etc/nginx/sites-available/otris
ln -sf /etc/nginx/sites-available/otris /etc/nginx/sites-enabled/otris
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "==> Setup complete!"
echo "    Next: run deploy.sh to push the app"
