#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/repo7}"
APP_NAME="${APP_NAME:-caretrack}"
PORT="${PORT:-4173}"
HEALTH_URL="http://127.0.0.1:$PORT/__caretrack_health"

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

install_dependencies
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 status "$APP_NAME"

echo "==> Waiting for $APP_NAME health check at $HEALTH_URL"
for attempt in {1..30}; do
  if curl -fsS "$HEALTH_URL"; then
    echo
    echo "==> $APP_NAME is healthy"
    exit 0
  fi

  sleep 2
done

echo "==> $APP_NAME did not pass health check after 60 seconds" >&2
pm2 logs "$APP_NAME" --lines 80 --nostream || true
exit 1
