# ADR 0002: Konfiguracja i sekrety przez pliki .env

## Spis treści
- [Status](#status)
- [Kontekst](#kontekst)
- [Decyzja](#decyzja)
- [Konsekwencje](#konsekwencje)
- [Jak zweryfikować](#jak-zweryfikowac)

## Status
Obowiązująca.

## Kontekst
Aplikacja wymaga konfiguracji środowiskowej (DB, sekrety NextAuth, backupy).

## Decyzja
- Konfiguracja oparta o pliki `.env` oraz `env.production.example`.
- Docker Compose wstrzykuje zmienne do kontenerów (`docker-compose.yml`, `docker-compose.prod.yml`).
- Prisma ładuje `.env`, `.env.local`, `.env.production` (`prisma.config.ts`).

## Konsekwencje
- Konieczne zarządzanie sekretami poza repozytorium (brak wartości w git).
- Produkcja opiera się o `.env.production` i sekrety CI.

## Jak zweryfikować
- `env.production.example`, `docker-compose*.yml`, `prisma.config.ts`.
