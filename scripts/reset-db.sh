#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker-compose -f docker-compose.prod.yml"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

DB_USER="${DB_USER:-${POSTGRES_USER:-postgres1}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-oceny}}"

if [[ "${RESET_DB:-}" != "YES" ]]; then
  echo "ERROR: This will DROP all data in ${DB_NAME}."
  echo "Set RESET_DB=YES to proceed."
  exit 1
fi

echo "==> Dropping schema (cascade)"
$COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "==> Running migrations"
$COMPOSE exec -T app node node_modules/prisma/build/index.js migrate deploy

echo "==> Seeding database"
$COMPOSE exec -T app npm run db:seed

echo "==> Done"
