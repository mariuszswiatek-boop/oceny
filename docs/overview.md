# Overview systemu

## Spis treści
- [Mapa systemu](#mapa-systemu)
- [Komponenty i odpowiedzialności](#komponenty-i-odpowiedzialnosci)
- [Integracje i zależności](#integracje-i-zaleznosci)
- [Jak zweryfikować](#jak-zweryfikowac)

## Mapa systemu

```mermaid
flowchart LR
  user[Użytkownik (przeglądarka)] -->|HTTPS| caddy[Caddy (reverse proxy)]
  user -->|HTTP dev| app[Next.js 16 (App Router)]
  caddy --> app
  app -->|Prisma| db[(PostgreSQL)]
  app -->|Playwright/Chromium| pdf[Renderowanie PDF]
  backup[Backup container] --> db
  backup --> rclone[(Google Drive via rclone)]
```

Legenda:
- Caddy jest używany wyłącznie w środowisku produkcyjnym (patrz `docker-compose.prod.yml`, `Caddyfile`).
- Renderowanie PDF wymaga dostępnego Chromium (patrz `lib/pdf/playwright.ts` i `Dockerfile`).

## Komponenty i odpowiedzialności
- Aplikacja webowa: `Next.js 16` + App Router w katalogu `app/` (UI i API).
- API: route handlers w `app/api/**/route.ts` (autoryzacja i logika domenowa).
- Autoryzacja: NextAuth (Credentials) w `lib/auth.ts` i `app/api/auth/[...nextauth]/route.ts`.
- Baza danych: PostgreSQL + Prisma (`prisma/schema.prisma`, `lib/prisma.ts`).
- Generowanie PDF: HTML + Playwright/Chromium (`lib/pdf/*`).
- Reverse proxy i TLS: Caddy (`Caddyfile`) w produkcji.
- Backupy: kontener `backup` (cron + pg_dump + rclone) (`docker/backup/`, `scripts/backup/backup.sh`).

## Integracje i zależności
- PostgreSQL: warstwa persystencji i źródło prawdy dla ocen i słowników.
- NextAuth: logowanie przez credentials (hasło hashowane bcrypt).
- Playwright/Chromium: generowanie plików PDF na żądanie.
- Rclone: opcjonalny eksport backupów do Google Drive.

## Jak zweryfikować
- Przejrzyj `docker-compose.yml` i `docker-compose.prod.yml`, aby potwierdzić zestaw usług.
- Sprawdź `lib/pdf/playwright.ts` i `Dockerfile` pod kątem wymagań Chromium.
