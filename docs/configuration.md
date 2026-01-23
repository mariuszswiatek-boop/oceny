# Konfiguracja i środowiska

## Spis treści
- [Źródła konfiguracji](#zrodla-konfiguracji)
- [Zmienne środowiskowe](#zmienne-srodowiskowe)
- [Profile środowisk](#profile-srodowisk)
- [Jak zweryfikować](#jak-zweryfikowac)

## Źródła konfiguracji
- `.env`, `.env.local`, `.env.production` są wczytywane przez `prisma.config.ts`.
- `docker-compose.yml` i `docker-compose.prod.yml` definiują zmienne runtime dla kontenerów.
- `env.production.example` zawiera przykładowe wartości produkcyjne.

## Zmienne środowiskowe

| Zmienna | Opis | Domyślna / przykład | Gdzie używana |
| --- | --- | --- | --- |
| `DATABASE_URL` | Połączenie Prisma z PostgreSQL | `postgresql://postgres:postgres@localhost:5433/oceny` | `prisma/schema.prisma`, `prisma.config.ts`, `docker-compose.yml`, `env.production.example` |
| `POSTGRES_USER` | Użytkownik DB | `postgres` | `docker-compose.yml`, `docker-compose.prod.yml`, `env.production.example`, `scripts/backup/backup.sh` |
| `POSTGRES_PASSWORD` | Hasło DB | `change-this-db-password` | `docker-compose.yml`, `docker-compose.prod.yml`, `env.production.example`, `scripts/backup/backup.sh` |
| `POSTGRES_DB` | Nazwa DB | `oceny` | `docker-compose.yml`, `docker-compose.prod.yml`, `env.production.example`, `scripts/backup/backup.sh` |
| `NEXTAUTH_SECRET` | Sekret podpisu sesji JWT | brak | `lib/auth.ts`, `docker-compose.yml`, `env.production.example` |
| `AUTH_SECRET` | Alternatywa dla `NEXTAUTH_SECRET` | brak | `lib/auth.ts` |
| `NEXTAUTH_URL` | Bazowy URL aplikacji | `http://localhost:3000` / `https://oceny.example.edu.pl` | `docker-compose.yml`, `docker-compose.prod.yml`, `env.production.example`, `README.md` (Wymaga potwierdzenia użycia przez NextAuth runtime) |
| `NEXTAUTH_DEBUG` | Debug NextAuth | `false` | `lib/auth.ts` |
| `AUTH_DEBUG` | Logi debug autoryzacji | `false` | `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts` |
| `CHROMIUM_PATH` | Ścieżka do Chromium | brak | `lib/pdf/playwright.ts` (fallback: `/usr/bin/chromium`, `/usr/bin/chromium-browser`) |
| `BACKUP_SCHEDULE` | Harmonogram backupów (cron) | `0 2 * * *` | `docker-compose.prod.yml`, `env.production.example` |
| `BACKUP_RETENTION_DAYS` | Retencja backupów (dni) | `14` | `docker-compose.prod.yml`, `env.production.example`, `scripts/backup/backup.sh` |
| `RCLONE_REMOTE` | Docelowy remote rclone | `gdrive:oceny` | `docker-compose.prod.yml`, `env.production.example`, `scripts/backup/backup.sh` |
| `RCLONE_CONFIG` | Ścieżka do configu rclone | `/config/rclone/rclone.conf` | `docker-compose.prod.yml`, `env.production.example`, `scripts/backup/backup.sh` |
| `POSTGRES_HOST` | Host DB w kontenerze backup | `postgres` | `docker-compose.prod.yml`, `scripts/backup/backup.sh` |
| `BACKUP_DIR` | Katalog backupów w kontenerze | `/backups` | `docker-compose.prod.yml`, `scripts/backup/backup.sh` |
| `NODE_ENV` | Tryb uruchomienia | `production` w `Dockerfile` | `lib/prisma.ts`, `Dockerfile` |
| `BACKUP_FILE` | Ścieżka do pliku backupu | `./backups/oceny_YYYYMMDD_HHMMSS.sql.gz` | `scripts/backup/restore.sh` |
| `RESTORE_DB` | Zgoda na restore (bezpiecznik) | `YES` | `scripts/backup/restore.sh` |
| `DROP_SCHEMA` | Usuń schemat przed restore | `YES` | `scripts/backup/restore.sh` |
| `DB_USER` | Użytkownik DB dla skryptów | `postgres` | `scripts/reset-db.sh`, `scripts/bootstrap-db.sh`, `scripts/backup/restore.sh` |
| `DB_NAME` | Nazwa DB dla skryptów | `oceny` | `scripts/reset-db.sh`, `scripts/bootstrap-db.sh`, `scripts/backup/restore.sh` |
| `RESET_DB` | Zgoda na reset DB | `YES` | `scripts/reset-db.sh` |
| `REBUILD_APP` | Czy odbudować app przy resecie | `YES` | `scripts/reset-db.sh` |
| `APP_DIR` | Katalog aplikacji na serwerze | `/opt/oceny` | `scripts/deploy.sh` |
| `COMPOSE_FILE` | Plik compose dla deploy | `docker-compose.prod.yml` | `scripts/deploy.sh` |
| `COMPOSE` | Komenda docker compose | `docker-compose -f docker-compose.prod.yml` | `scripts/backup/restore.sh` |

## Profile środowisk
- **Local dev (bez Dockera):** ustaw `.env` i uruchom `npm run dev`. Port DB zależy od Twojego Postgresa.
- **Local dev (z Docker Compose):** `docker compose up -d postgres`, `DATABASE_URL` na `localhost:5433`.
- **Production:** `.env.production` + `docker compose -f docker-compose.prod.yml up -d --build`.

## Jak zweryfikować
- Sprawdź wartości w `.env`, `.env.production` i `docker-compose*.yml`.
- Uruchom `npx prisma migrate dev` — jeśli `DATABASE_URL` jest poprawne, migracje przejdą.
