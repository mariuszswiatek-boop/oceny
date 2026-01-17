# System Ocen Montessori

Aplikacja webowa do zarządzania ocenami śródrocznymi w szkole Montessori. System pozwala nauczycielom wprowadzać oceny według skali Montessori, wychowawcom przeglądać oceny całej klasy i generować PDF z kartami ocen.

## Technologie

- **Frontend/Backend**: Next.js 16 (App Router) + TypeScript
- **Baza danych**: PostgreSQL
- **ORM**: Prisma
- **Autoryzacja**: NextAuth.js (Credentials)
- **UI**: Tailwind CSS
- **Walidacja**: Zod
- **PDF**: pdf-lib

## Wymagania

- Node.js 20+
- PostgreSQL 15+
- npm lub yarn

## Instalacja i uruchomienie

### Lokalnie (bez Docker)

1. **Sklonuj repozytorium i zainstaluj zależności:**

```bash
npm install
```

2. **Skonfiguruj zmienne środowiskowe:**

Utwórz plik `.env` w katalogu głównym:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oceny"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-this-to-a-random-secret-in-production"
```

3. **Uruchom migracje Prisma:**

```bash
npx prisma migrate dev
```

4. **Zasiej dane testowe:**

```bash
npm run db:seed
```

5. **Uruchom serwer deweloperski:**

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

### Z Docker Compose

1. **Uruchom kontenery:**

```bash
docker-compose up -d
```

2. **Uruchom migracje i seed (w kontenerze app):**

```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

## Wdrozenie w sieci (produkcja)

Do wdrozen produkcyjnych przygotowany jest plik `docker-compose.prod.yml`
i skrypt `scripts/deploy.sh`. Pelny plan instalacji oraz konfiguracji
automatycznego publikowania zmian znajdziesz w `docs/deploy.md`.

## Dane logowania (seed)

Po uruchomieniu seed, możesz zalogować się używając następujących kont:

### Administrator
- **Email**: `admin@szkola.pl`
- **Hasło**: `password123`
- **Rola**: ADMIN

### Wychowawca
- **Email**: `wychowawca@szkola.pl`
- **Hasło**: `password123`
- **Rola**: HOMEROOM

### Nauczyciel 1
- **Email**: `nauczyciel1@szkola.pl`
- **Hasło**: `password123`
- **Rola**: TEACHER
- **Przedmioty**: Język polski, Historia

### Nauczyciel 2
- **Email**: `nauczyciel2@szkola.pl`
- **Hasło**: `password123`
- **Rola**: TEACHER
- **Przedmioty**: Matematyka, Przyroda/Biologia

## Role i uprawnienia

### ADMIN
- Zarządzanie słownikami (przedmioty, klasy, rok szkolny, skala ocen)
- Zarządzanie użytkownikami (nauczyciele)
- Przypisania nauczycieli do klas/przedmiotów
- Przypisania wychowawców do klas
- Eksport PDF

### TEACHER
- Widzi tylko swoje przedmioty
- Widzi tylko klasy/uczniów, do których jest przypisany
- Może wprowadzać/zmieniać oceny z "jego" przedmiotu
- Autosave przy zmianie oceny

### HOMEROOM
- Widzi całą swoją klasę (uczniów)
- Widzi oceny ze wszystkich przedmiotów dla swojej klasy
- Może generować PDF dla uczniów w swojej klasie (pojedynczy lub cała klasa)

### READONLY (opcjonalnie)
- Podgląd (funkcjonalność do rozbudowy)

## Struktura API

### Nauczyciel

- `GET /api/nauczyciel/classes` - Lista klas nauczyciela
- `GET /api/nauczyciel/subjects` - Lista przedmiotów nauczyciela
- `GET /api/nauczyciel/classes/[classId]/students` - Lista uczniów w klasie
- `GET /api/nauczyciel/grades` - Pobierz oceny (query: classId, subjectId, schoolYearId)
- `POST /api/nauczyciel/grades` - Zapisz/aktualizuj ocenę
- `GET /api/nauczyciel/grade-scales` - Pobierz skalę ocen

### Wychowawca

- `GET /api/wychowawca/classes` - Lista klas wychowawcy
- `GET /api/wychowawca/classes/[classId]/grades` - Pobierz wszystkie oceny klasy
- `GET /api/wychowawca/classes/[classId]/students/[studentId]/pdf` - Generuj PDF dla ucznia
- `GET /api/wychowawca/classes/[classId]/pdf-all` - Generuj PDF dla całej klasy (format: zip lub single)

### Wspólne

- `GET /api/school-year/active` - Pobierz aktywny rok szkolny

## Model danych

### Główne encje

- **SchoolYear** - Rok szkolny (np. 2023/2024)
- **Class** - Klasa (np. 2A, 3B) z przypisanym wychowawcą
- **Student** - Uczeń (imię, nazwisko, klasa)
- **ParentContact** - Kontakt do rodzica (email, powiązany ze Student)
- **Subject** - Przedmiot (słownik)
- **TeacherAssignment** - Przypisanie nauczyciela do przedmiotu i klasy
- **MontessoriGradeScale** - Skala ocen Montessori (4 poziomy z kolorami)
- **StudentGrade** - Ocena ucznia (student + przedmiot + rok szkolny -> ocena)

### Skala ocen Montessori

1. **NIE/SŁABO OPANOWAŁ** - Czerwony (#FF0000)
2. **ŚREDNIO OPANOWAŁ** - Żółty (#FFFF00)
3. **DOBRZE OPANOWAŁ** - Zielony jasny (#90EE90)
4. **DOSKONALE OPANOWAŁ** - Zielony mocny (#006400)

## Bezpieczeństwo

- Rygorystyczne sprawdzanie uprawnień w każdym endpoincie
- Ochrona przed IDOR (Insecure Direct Object Reference)
- Audit trail: przy zapisie oceny zapisujemy `teacherId` i `updatedAt`
- Middleware chroniący routes według ról

## Funkcjonalności

### Nauczyciel
- Lista klas, które uczy
- Wybór aktywnego przedmiotu
- Tabela uczniów z szybkim wyborem oceny (radio buttons)
- Autosave przy zmianie oceny (z toast notification)

### Wychowawca
- Wybór klasy (swojej)
- Tabela: uczniowie w wierszach, przedmioty w kolumnach, w komórkach ocena (kolor)
- Generowanie PDF:
  - Dla jednego ucznia
  - Masowo: dla całej klasy (ZIP z osobnymi plikami lub jeden wielostronicowy PDF)

### PDF
- Układ zgodny z wymaganiami
- Nagłówek: "ROK SZKOLNY" i "OCENY ŚRÓDROCZNE"
- Pola: HOMEROOM, IMIĘ I NAZWISKO UCZNIA, KLASA
- Tabela z przedmiotami i kolumnami ocen (zaznaczenie kółkiem w odpowiednim kolorze)
- Kolumna "Podpis nauczyciela"

## Rozwój

### Dodawanie nowych funkcji

1. Migracje Prisma: `npx prisma migrate dev --name nazwa_migracji`
2. Seed danych: `npm run db:seed`
3. Testy: (do dodania w przyszłości)

### Struktura projektu

```
/app
  /api          # API routes
  /nauczyciel   # Strony dla nauczyciela
  /wychowawca   # Strony dla wychowawcy
  /admin        # Strony dla admina
  /login        # Strona logowania
/lib            # Utility functions
/prisma         # Schemat Prisma i seed
```

## Uwagi

- W produkcji zmień `NEXTAUTH_SECRET` na losowy, bezpieczny sekret
- Skonfiguruj właściwy `DATABASE_URL` dla środowiska produkcyjnego
- Rozważ dodanie HTTPS
- Rozważ dodanie rate limiting
- Rozważ dodanie logowania (np. pino)

## Licencja

Prywatny projekt dla szkoły Montessori.
