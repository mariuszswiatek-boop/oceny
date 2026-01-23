# API i kontrakty

## Spis treści
- [Autoryzacja](#autoryzacja)
- [Konwencje odpowiedzi](#konwencje-odpowiedzi)
- [Endpointy](#endpointy)
- [Przykłady](#przyklady)
- [Jak zweryfikować](#jak-zweryfikowac)

## Autoryzacja
- NextAuth Credentials (`lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`).
- Sesja oparta o JWT (patrz `lib/auth.ts`).
- Uprawnienia sprawdzane przez `requireRole` i helpery w `lib/permissions.ts`.

## Konwencje odpowiedzi
Typowe błędy:
- `400` — błąd walidacji lub brak parametru (`{ error, details? }`).
- `403` — brak uprawnień (`{ error }`).
- `404` — brak zasobu (`{ error }`).
- `409` — konflikt danych historycznych (`{ error }`).
- `500` — błąd serwera (`{ error }`).

## Endpointy

### Auth
- `GET/POST /api/auth/[...nextauth]` — endpointy NextAuth (logowanie, callback).

### School year (public)
- `GET /api/school-year/active` — aktywny rok szkolny.

### Admin (`requireRole("ADMIN")`)
- `GET/POST /api/admin/users`
- `PATCH/DELETE /api/admin/users/{id}`
  - Body (POST): `email`, `password`, `firstName`, `lastName`, `roles[]`, `isActive?`
  - Body (PATCH): pola jak wyżej (opcjonalne)
- `GET/POST /api/admin/classes`
- `PATCH/DELETE /api/admin/classes/{id}`
  - Body: `name`, `schoolYearId`, `teacherId?`, `sortOrder?`, `isActive?`
- `GET/POST /api/admin/students`
- `PATCH/DELETE /api/admin/students/{id}`
  - Body: `firstName`, `lastName`, `classId`, `isActive?`
  - DELETE zwraca `409`, jeśli istnieją oceny historyczne.
- `GET/POST /api/admin/subjects`
- `PATCH/DELETE /api/admin/subjects/{id}`
  - Body: `name`, `sortOrder?`, `isActive?`
  - DELETE zwraca `409`, jeśli istnieją przypisania/oceny.
- `GET/POST /api/admin/grade-scales`
- `PATCH/DELETE /api/admin/grade-scales/{id}`
  - Body: `label`, `colorHex`, `sortOrder`, `isActive?`
  - DELETE zwraca `409`, jeśli skala jest użyta w ocenach.
- `GET/POST /api/admin/parent-contacts`
- `PATCH/DELETE /api/admin/parent-contacts/{id}`
  - Body: `studentId`, `email`, `fullName?`, `phone?`, `isPrimary?`
- `GET/POST /api/admin/school-years`
- `PATCH/DELETE /api/admin/school-years/{id}`
  - Body: `name`, `startDate?`, `endDate?`, `isActive?`, `gradingTerm?`, `isGradingOpen?`, `sortOrder?`
  - DELETE zwraca `409`, jeśli są dane historyczne.
- `GET/POST /api/admin/teacher-assignments`
- `PATCH/DELETE /api/admin/teacher-assignments/{id}`
  - Body: `teacherId`, `classId`, `subjectId`, `schoolYearId?`, `isActive?`

### Nauczyciel (`requireRole("TEACHER")`)
- `GET /api/nauczyciel/classes` — klasy nauczyciela + `gradeSummary`.
- `GET /api/nauczyciel/subjects?classId=&schoolYearId=` — przedmioty nauczyciela.
- `GET /api/nauczyciel/classes/{classId}/students` — uczniowie klasy.
- `GET /api/nauczyciel/grade-scales` — skala ocen.
- `GET /api/nauczyciel/grades?classId=&subjectId=&schoolYearId=&term=` — oceny.
- `POST /api/nauczyciel/grades` — zapis/aktualizacja oceny.
  - Body: `studentId`, `subjectId`, `schoolYearId`, `term`, `gradeScaleId|null`

### Wychowawca (`requireRole("HOMEROOM")`)
- `GET /api/wychowawca/classes` — klasy wychowawcy + `summary`.
- `GET /api/wychowawca/classes/{classId}/grades?schoolYearId=` — pełne dane ocen klasy.
- `GET /api/wychowawca/classes/{classId}/students/{studentId}/pdf?schoolYearId=&term=` — PDF pojedynczego ucznia.
- `GET /api/wychowawca/classes/{classId}/pdf-all?schoolYearId=&term=` — ZIP z PDF całej klasy.

## Przykłady

Pobranie aktywnego roku:
```bash
curl -s http://localhost:3000/api/school-year/active
```

Zapis oceny (po zalogowaniu w przeglądarce):
```bash
curl -s -X POST http://localhost:3000/api/nauczyciel/grades \
  -H "Content-Type: application/json" \
  -d '{"studentId":"...","subjectId":"...","schoolYearId":"...","term":"MIDYEAR","gradeScaleId":"..."}'
```

## Jak zweryfikować
- Endpointy i schematy payloadów wynikają z `app/api/**/route.ts`.
- Sprawdź walidacje Zod w plikach route dla szczegółów.
