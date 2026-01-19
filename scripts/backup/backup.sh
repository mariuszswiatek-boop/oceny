#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-oceny}"

timestamp="$(date -u +"%Y%m%d_%H%M%S")"
backup_file="${BACKUP_DIR}/oceny_${timestamp}.sql.gz"

mkdir -p "${BACKUP_DIR}"

PGPASSWORD="${POSTGRES_PASSWORD:-}" \
  pg_dump -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  | gzip > "${backup_file}"

if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  rclone copy "${backup_file}" "${RCLONE_REMOTE}" \
    --config "${RCLONE_CONFIG:-/config/rclone/rclone.conf}"
fi

find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
