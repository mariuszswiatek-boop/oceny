# Runbook operacyjny

## Spis treści
- [Observability](#observability)
- [Backup i odtwarzanie](#backup-i-odtwarzanie)
- [Rotacja sekretów](#rotacja-sekretow)
- [Typowe procedury](#typowe-procedury)
- [Incident response checklist](#incident-response-checklist)
- [Jak zweryfikować](#jak-zweryfikowac)

## Observability
- Logi aplikacji: standardowe logi procesu Node (stdout/stderr). Brak dedykowanego loggera w repozytorium.
- Metryki i tracing: brak integracji w kodzie (Wymaga potwierdzenia, czy mają zostać dodane).

## Backup i odtwarzanie
Backupy:
- Kontener `backup` uruchamia `scripts/backup/backup.sh` (cron).
- Pliki `.sql.gz` trafiają do `./backups` na hoście (`docker-compose.prod.yml`).
- Opcjonalny upload do Google Drive przez `rclone`.

Odtwarzanie:
Skrypt: `scripts/backup/restore.sh`.

Przykład:
```bash
RESTORE_DB=YES BACKUP_FILE=./backups/oceny_YYYYMMDD_HHMMSS.sql.gz \
  ./scripts/backup/restore.sh
```

Opcjonalnie usuń schemat przed restore:
```bash
RESTORE_DB=YES DROP_SCHEMA=YES BACKUP_FILE=./backups/oceny_YYYYMMDD_HHMMSS.sql.gz \
  ./scripts/backup/restore.sh
```

## Rotacja sekretów
- Zmień `NEXTAUTH_SECRET` i hasło DB (`POSTGRES_PASSWORD`) w `.env.production`.
- Zrestartuj kontenery: `docker compose -f docker-compose.prod.yml up -d`.
- Zaktualizuj sekrety CI, jeśli zmieniły się dane SSH.

## Typowe procedury
Restart aplikacji:
```bash
docker compose -f docker-compose.prod.yml up -d app
```

Wymuszenie migracji:
```bash
docker compose -f docker-compose.prod.yml exec -T app \
  node node_modules/prisma/build/index.js migrate deploy
```

## Incident response checklist
- [ ] Sprawdź status kontenerów (`docker compose -f docker-compose.prod.yml ps`).
- [ ] Sprawdź logi (`docker compose -f docker-compose.prod.yml logs --tail=200 app`).
- [ ] Zweryfikuj połączenie z DB (`docker compose -f docker-compose.prod.yml exec -T postgres pg_isready`).
- [ ] Sprawdź miejsce na dysku (`df -h`).
- [ ] Odtwórz ostatnie zmiany z pipeline (`GitHub Actions → Deploy`).

## Jak zweryfikować
- Źródła backupów: `docker-compose.prod.yml`, `scripts/backup/backup.sh`.
