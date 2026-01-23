# CI/CD i release

## Spis treści
- [Pipeline](#pipeline)
- [Sekrety](#sekrety)
- [Release krok po kroku](#release-krok-po-kroku)
- [Artefakty i cache](#artefakty-i-cache)
- [Jak zweryfikować](#jak-zweryfikowac)

## Pipeline
Źródło: `.github/workflows/deploy.yml`
- Trigger: `push` na `main`.
- Job: `deploy` na `ubuntu-latest`.
- Akcja: `appleboy/ssh-action@v1.0.3`.
- Komenda na serwerze: `APP_DIR=/opt/oceny bash /opt/oceny/scripts/deploy.sh`.

## Sekrety
Wymagane sekrety GitHub Actions (opisane też w `docs/deploy.md`):
- `SSH_HOST`
- `SSH_USER`
- `SSH_PORT`
- `SSH_KEY`

## Release krok po kroku
1. Upewnij się, że `main` zawiera oczekiwane zmiany.
2. Wypchnij do `main` (`git push origin main`).
3. Sprawdź logi workflow „Deploy” w GitHub Actions.
4. Na serwerze zweryfikuj uruchomione kontenery (`docker compose -f docker-compose.prod.yml ps`).

## Artefakty i cache
W pipeline nie ma cache ani artefaktów. Wymaga potwierdzenia, czy to wystarczające dla projektu.

## Jak zweryfikować
- Otwórz `.github/workflows/deploy.yml`.
- Sprawdź `scripts/deploy.sh`.
