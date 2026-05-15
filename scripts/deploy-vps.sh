#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/repo7}"

echo "==> Deploying CareTrack from $APP_DIR"
cd "$APP_DIR"

git pull --ff-only
npm ci
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 status caretrack

curl -fsS "http://127.0.0.1:${PORT:-4173}/__caretrack_health"
echo
