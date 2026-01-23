#!/usr/bin/env bash
set -euo pipefail

COMPOSE="${COMPOSE:-docker-compose -f docker-compose.prod.yml}"
BACKUP_FILE="${1:-${BACKUP_FILE:-}}"
DB_USER="${DB_USER:-${POSTGRES_USER:-postgres}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-oceny}}"

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "ERROR: Provide backup file path as arg or BACKUP_FILE env."
  echo "Example: BACKUP_FILE=./backups/oceny_YYYYMMDD_HHMMSS.sql.gz"
  exit 1
fi

if [[ "${RESTORE_DB:-}" != "YES" ]]; then
  echo "ERROR: This will restore data into ${DB_NAME}."
  echo "Set RESTORE_DB=YES to proceed."
  exit 1
fi

if [[ "${DROP_SCHEMA:-}" == "YES" ]]; then
  echo "==> Dropping schema (cascade)"
  $COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

echo "==> Restoring from ${BACKUP_FILE}"
gunzip -c "${BACKUP_FILE}" | $COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME"

echo "==> Done"
