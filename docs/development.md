# Uruchomienie lokalne (Developer Experience)

## Spis treści
- [Złota ścieżka](#zlota-sciezka)
- [Wymagania](#wymagania)
- [Konfiguracja środowiska](#konfiguracja-srodowiska)
- [Migracje i seed](#migracje-i-seed)
- [Lint i format](#lint-i-format)
- [Debug](#debug)
- [Docker Compose](#docker-compose)
- [Skrypty pomocnicze](#skrypty-pomocnicze)
- [Jak zweryfikować](#jak-zweryfikowac)

## Złota ścieżka
1. Uruchom bazę danych: `docker compose up -d postgres`.
2. Skonfiguruj `.env` (patrz sekcja poniżej).
3. Zainstaluj zależności: `npm install`.
4. Migracje: `npx prisma migrate dev`.
5. Seed: `npm run db:seed`.
6. Start dev: `npm run dev`.

## Wymagania
- Node.js 20+ (`package.json`).
- PostgreSQL 15+.
- npm.
- Docker (opcjonalnie, dla bazy i pełnego uruchomienia w kontenerach).

## Konfiguracja środowiska
Utwórz plik `.env` w katalogu głównym. Minimalny zestaw dla lokalnego uruchomienia:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/oceny"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-this-local-secret"
```

Uwagi:
- Port `5433` wynika z `docker-compose.yml` (mapowanie `5433:5432`).
- Jeśli używasz lokalnego Postgresa bez Dockera (domyślnie `5432`), zaktualizuj `DATABASE_URL`.

## Migracje i seed
Polecenia:

```bash
npx prisma migrate dev
npm run db:seed
```

Seed tworzy użytkowników i dane demonstracyjne (`prisma/seed.ts`).

## Lint i format
- Lint: `npm run lint`.
- Format: brak osobnego skryptu w `package.json`. Wymaga potwierdzenia i ewentualnego dodania (np. Prettier).

## Debug
Zmienne wspierające debug:
- `AUTH_DEBUG=true` — logi dla autoryzacji (patrz `lib/auth.ts` i `app/api/auth/[...nextauth]/route.ts`).
- `NEXTAUTH_DEBUG=true` — tryb debug NextAuth (patrz `lib/auth.ts`).

## Docker Compose
Plik `docker-compose.yml` uruchamia:
- `postgres` (port hosta `5433`).
- `app` (port `3000`).

Szczegóły (`docker-compose.yml`):
- Porty: `5433:5432` (Postgres), `3000:3000` (app).
- Wolumeny: `postgres_data`, oraz bind mount aplikacji `.:/app`.
- Healthcheck: `pg_isready -U postgres` dla Postgresa.

Szczegóły produkcyjne (`docker-compose.prod.yml`):
- Usługi: `caddy`, `postgres`, `app`, `backup`.
- Porty: `80` i `443` (Caddy).
- Wolumeny: `caddy_data`, `caddy_config`, `postgres_data`, `./backups`, `./rclone`, `./certs`.
- Healthcheck: `pg_isready` dla Postgresa.

Przykłady:
```bash
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

## Skrypty pomocnicze
- `scripts/reset-db.sh` — reset bazy w środowisku produkcyjnym (wymaga `RESET_DB=YES`).
- `scripts/bootstrap-db.sh` — naprawy schematu i ponowny seed (używa `docker-compose.prod.yml`).

## Jak zweryfikować
- `npm run dev` uruchamia aplikację na `http://localhost:3000`.
- `docker compose ps` pokazuje `postgres` w stanie healthy.
