# ADR 0003: Deploy przez Docker Compose i SSH z GitHub Actions

## Spis treści
- [Status](#status)
- [Kontekst](#kontekst)
- [Decyzja](#decyzja)
- [Konsekwencje](#konsekwencje)
- [Jak zweryfikować](#jak-zweryfikowac)

## Status
Obowiązująca.

## Kontekst
Wdrożenia realizowane są na serwerze z Dockerem, z automatyzacją po pushu do `main`.

## Decyzja
- Deploy przez `docker-compose.prod.yml` i skrypt `scripts/deploy.sh`.
- Automatyczny trigger GitHub Actions po pushu do `main` (SSH do serwera).

## Konsekwencje
- Wymagany dostęp SSH i poprawnie skonfigurowane sekrety CI.
- Brak etapów testów w pipeline (do rozważenia).

## Jak zweryfikować
- `.github/workflows/deploy.yml`, `scripts/deploy.sh`.
