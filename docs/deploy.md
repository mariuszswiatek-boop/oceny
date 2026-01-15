## Plan wdrozenia w sieci (Oracle Cloud Free Tier + Docker)

Ten plan zaklada uruchomienie aplikacji na darmowym VPS w Oracle Cloud Free Tier
(Compute: Ampere A1) z Dockerem. Daje to pelna kontrole i latwe auto-wdrozenia.

### 1) Przygotowanie serwera (Oracle Cloud)
1. Zaloz konto w Oracle Cloud i aktywuj **Free Tier**.
2. Utworz instancje **Compute** (Ampere A1):
   - Image: **Ubuntu 22.04** lub nowszy.
   - Shape: Ampere A1 (w ramach darmowego limitu).
   - Dodaj klucz SSH do logowania.
3. W **Networking** otworz porty w **Security List** lub **Network Security Group**:
   - 22 (SSH)
   - 80 i 443 (HTTP/HTTPS) albo 3000 (jesli bez reverse proxy)
4. Na instancji zainstaluj Docker i Docker Compose.

### 2) Instalacja aplikacji na serwerze (Oracle)
1. Sklonuj repozytorium do katalogu, np. `/opt/oceny`.
2. Skopiuj `env.production.example` do `.env.production` i uzupelnij wartosci.
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

### 3) Automatyczna publikacja zmian (CI/CD)

W repozytorium jest gotowy workflow GitHub Actions: `.github/workflows/deploy.yml`.
Po kazdym push na `main` workflow polaczy sie po SSH i uruchomi
`/opt/oceny/scripts/deploy.sh`.

Kroki konfiguracji:
- Dodaj klucz SSH dla serwera (np. `~/.ssh/deploy_key`).
- Dodaj klucz publiczny do `~/.ssh/authorized_keys` na serwerze.
- W ustawieniach repozytorium dodaj sekrety:
  - `SSH_HOST` (np. `203.0.113.10`)
  - `SSH_USER` (np. `deploy`)
  - `SSH_PORT` (np. `22`)
  - `SSH_KEY` (zawartosc prywatnego klucza)

### 4) Pierwsze wdrozenie

1. Wykonaj kroki z sekcji instalacji.
2. Zrob push na `main` i sprawdz logi workflow w GitHub Actions.
3. Po wdrozeniu aplikacja bedzie dostepna pod `NEXTAUTH_URL`.
