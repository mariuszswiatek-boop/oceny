# Wdrożenie produkcyjne (Oracle Cloud Free Tier + Docker)

## Spis treści
- [Założenia](#zalozenia)
- [Przygotowanie serwera](#przygotowanie-serwera)
- [Instalacja aplikacji](#instalacja-aplikacji)
- [Automatyczna publikacja zmian (CI/CD)](#automatyczna-publikacja-zmian-cicd)
- [Backupy](#backupy)
- [Jak zweryfikować](#jak-zweryfikowac)

## Założenia
Plan zakłada Oracle Cloud Free Tier (Compute: Ampere A1) i Docker. Caddy pełni rolę reverse proxy dla HTTPS (`Caddyfile`).

## Przygotowanie serwera
1. Utwórz instancję Compute (Ubuntu 22.04+).
2. Dodaj klucz SSH do logowania.
3. Otwórz porty:
   - `22` (SSH)
   - `80` i `443` (HTTP/HTTPS) lub `3000` (bez reverse proxy)
4. Zainstaluj Docker i Docker Compose.

## Instalacja aplikacji
1. Sklonuj repozytorium do `/opt/oceny`.
2. Skopiuj `env.production.example` do `.env.production` i uzupełnij wartości.
3. Zbuduj i uruchom kontenery:

```bash
cd /opt/oceny
docker compose -f docker-compose.prod.yml up -d --build
```

4. Uruchom migracje:

```bash
docker compose -f docker-compose.prod.yml exec -T app \
  node node_modules/prisma/build/index.js migrate deploy
```

## Automatyczna publikacja zmian (CI/CD)
Workflow: `.github/workflows/deploy.yml`.
- Trigger: push na `main`.
- Akcja: SSH do serwera i uruchomienie `scripts/deploy.sh`.

Konfiguracja:
- Dodaj klucz SSH dla serwera.
- Dodaj klucz publiczny do `~/.ssh/authorized_keys`.
- Skonfiguruj sekrety:
  - `SSH_HOST`
  - `SSH_USER`
  - `SSH_PORT`
  - `SSH_KEY`

## Backupy
Backupy uruchamiane są przez kontener `backup` (cron).
- Wynik: `./backups/*.sql.gz` na hoście.
- Opcjonalny upload do Google Drive przez `rclone`.

Konfiguracja rclone:
```bash
rclone config
mkdir -p /opt/oceny/rclone
cp ~/.config/rclone/rclone.conf /opt/oceny/rclone/rclone.conf
```

W `.env.production` ustaw:
- `BACKUP_SCHEDULE`
- `BACKUP_RETENTION_DAYS`
- `RCLONE_REMOTE`

## Jak zweryfikować
- `docker compose -f docker-compose.prod.yml ps` — sprawdź status kontenerów.
- Logi backupów: `docker compose -f docker-compose.prod.yml logs --tail=200 backup`.
