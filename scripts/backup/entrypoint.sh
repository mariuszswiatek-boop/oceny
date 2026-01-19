#!/usr/bin/env bash
set -euo pipefail

schedule="${BACKUP_SCHEDULE:-0 2 * * *}"

mkdir -p /etc/crontabs
mkdir -p /backups
touch /var/log/backup.log

echo "${schedule} /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

exec crond -f -l 8
