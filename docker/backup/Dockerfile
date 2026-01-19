FROM postgres:15-alpine

RUN apk add --no-cache bash tzdata rclone

COPY scripts/backup/backup.sh /usr/local/bin/backup.sh
COPY scripts/backup/entrypoint.sh /entrypoint.sh

RUN chmod +x /usr/local/bin/backup.sh /entrypoint.sh

ENV BACKUP_DIR=/backups \
    BACKUP_RETENTION_DAYS=14 \
    BACKUP_SCHEDULE="0 2 * * *" \
    POSTGRES_HOST=postgres

ENTRYPOINT ["/entrypoint.sh"]
