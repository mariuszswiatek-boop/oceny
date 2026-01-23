# Troubleshooting

## Spis treści
- [Autoryzacja i role](#autoryzacja-i-role)
- [Baza danych](#baza-danych)
- [PDF i Chromium](#pdf-i-chromium)
- [API i walidacja](#api-i-walidacja)
- [Jak zweryfikować](#jak-zweryfikowac)

## Autoryzacja i role
Objaw: `403 Forbidden` na endpointach `/api/admin/**`, `/api/nauczyciel/**`, `/api/wychowawca/**`.
- Przyczyna: brak roli w sesji (`lib/permissions.ts`).
- Rozwiązanie: zaloguj się kontem z właściwą rolą (seed w `prisma/seed.ts`).

Objaw: przekierowanie na `/login` lub `/unauthorized`.
- Przyczyna: brak sesji lub roli; middleware chroni `admin`, `nauczyciel`, `wychowawca`, `dashboard` (`middleware.ts`).

## Baza danych
Objaw: `No active school year found` w API nauczyciela/wychowawcy.
- Przyczyna: brak aktywnego `SchoolYear`.
- Rozwiązanie: uruchom seed (`npm run db:seed`) lub ustaw `isActive` w DB.

Objaw: `School year is not active` / `Grading term is closed` / `Grading is locked`.
- Przyczyna: wartości `SchoolYear.isActive`, `gradingTerm`, `isGradingOpen`.
- Rozwiązanie: zaktualizuj rekord roku szkolnego w DB (`/api/admin/school-years`).

Objaw: `Student has historical grades. Archive instead.` lub `Subject is used in historical data. Archive it instead.`
- Przyczyna: próba usunięcia danych powiązanych z ocenami.
- Rozwiązanie: ustaw `isActive=false` zamiast DELETE.

## PDF i Chromium
Objaw: `Chromium executable not found`.
- Przyczyna: brak Chromium na hoście lub brak `CHROMIUM_PATH`.
- Rozwiązanie: zainstaluj Chromium lub ustaw `CHROMIUM_PATH`. W kontenerze produkcyjnym Chromium jest instalowane (`Dockerfile`).

## API i walidacja
Objaw: `Invalid input` (status 400).
- Przyczyna: walidacja Zod w `route.ts`.
- Rozwiązanie: dopasuj payload do schematów w `app/api/**/route.ts`.

## Jak zweryfikować
- Sprawdź komunikaty błędów w `app/api/**/route.ts`.
