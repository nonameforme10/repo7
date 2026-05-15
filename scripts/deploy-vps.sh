#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/repo7}"
APP_NAME="${APP_NAME:-caretrack}"
PORT="${PORT:-4173}"

install_dependencies() {
  if npm ci; then
    return 0
  fi

  echo "==> npm ci failed; removing node_modules and retrying once"
  rm -rf node_modules
  npm ci
}

echo "==> Deploying CareTrack from $APP_DIR"
cd "$APP_DIR"

git pull --ff-only

if command -v pm2 >/dev/null 2>&1 && pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "==> Stopping $APP_NAME before replacing dependencies"
  pm2 stop "$APP_NAME" || true
fi

install_dependencies
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 status "$APP_NAME"

curl -fsS "http://127.0.0.1:$PORT/__caretrack_health"
echo
