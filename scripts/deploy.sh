#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/oceny}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

git fetch origin main
git pull --ff-only origin main

docker compose -f "$COMPOSE_FILE" build --pull
docker compose -f "$COMPOSE_FILE" up -d

# Apply database migrations after new containers are running.
docker compose -f "$COMPOSE_FILE" exec -T app \
  node node_modules/prisma/build/index.js migrate deploy
