#!/bin/bash
set -euo pipefail

# Otris deployment script for DigitalOcean droplet
# Usage: ./deploy.sh [user@host]

APP_DIR="/opt/otris"
SERVICE_NAME="otris"
REMOTE="${1:-}"

if [ -z "$REMOTE" ]; then
  echo "Usage: ./deploy.sh user@host"
  exit 1
fi

echo "==> Building production bundle..."
npm run build

echo "==> Syncing files to $REMOTE:$APP_DIR..."
ssh "$REMOTE" "mkdir -p $APP_DIR"
rsync -avz --delete \
  dist/ \
  package.json \
  package-lock.json \
  "$REMOTE:$APP_DIR/"

echo "==> Installing production dependencies..."
ssh "$REMOTE" "cd $APP_DIR && npm ci --omit=dev"

echo "==> Restarting service..."
ssh "$REMOTE" "sudo systemctl restart $SERVICE_NAME"

echo "==> Done! Checking status..."
ssh "$REMOTE" "sudo systemctl status $SERVICE_NAME --no-pager"
