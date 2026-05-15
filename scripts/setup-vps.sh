#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/repo7}"
APP_NAME="${APP_NAME:-caretrack}"
PORT="${PORT:-4173}"
DOMAIN="${DOMAIN:-_}"
NODE_MAJOR="${NODE_MAJOR:-24}"

install_dependencies() {
  if npm ci; then
    return 0
  fi

  echo "==> npm ci failed; removing node_modules and retrying once"
  rm -rf node_modules
  npm ci
}

echo "==> CareTrack first-time VPS setup"
echo "App directory: $APP_DIR"
echo "Nginx server_name: $DOMAIN"

cd "$APP_DIR"

if ! command -v node >/dev/null 2>&1 || ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo "==> Installing Node.js $NODE_MAJOR"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Installing system packages"
sudo apt-get update
sudo apt-get install -y nginx

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  sudo npm install -g pm2
fi

echo "==> Installing app dependencies"
install_dependencies

echo "==> Building Next.js app"
npm run build

echo "==> Starting app with PM2"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
sudo env "PATH=$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

echo "==> Configuring Nginx"
sudo tee "/etc/nginx/sites-available/$APP_NAME" >/dev/null <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

sudo ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "==> Health checks"
curl -fsS "http://127.0.0.1:$PORT/__caretrack_health"
echo
curl -I "http://127.0.0.1/" | head -n 1

echo "==> Done. Open http://YOUR_SERVER_IP/ after allowing HTTP traffic in your cloud firewall."
