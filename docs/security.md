# Bezpieczeństwo

## Spis treści
- [Uwierzytelnianie i autoryzacja](#uwierzytelnianie-i-autoryzacja)
- [Przechowywanie sekretów](#przechowywanie-sekretow)
- [Kontrola dostępu do tras](#kontrola-dostepu-do-tras)
- [CORS/CSRF i rate limit](#corscsrf-i-rate-limit)
- [Rekomendacje](#rekomendacje)
- [Jak zweryfikować](#jak-zweryfikowac)

## Uwierzytelnianie i autoryzacja
- Logowanie: NextAuth Credentials (`lib/auth.ts`).
- Hasła: weryfikowane bcrypt (`bcrypt.compare`).
- Role: `ADMIN`, `TEACHER`, `HOMEROOM`, `READONLY` (`prisma/schema.prisma`).
- Sesja: JWT (`lib/auth.ts`, `types/next-auth.d.ts`).

## Przechowywanie sekretów
- `NEXTAUTH_SECRET` jest wymagany w runtime (`lib/auth.ts`).
- Sekrety i hasła DB przechowywane w `.env.production` (patrz `env.production.example`).

## Kontrola dostępu do tras
- Middleware blokuje ścieżki `/admin`, `/nauczyciel`, `/wychowawca`, `/dashboard` (`middleware.ts`).
- API wymusza role przez `requireRole` (`lib/permissions.ts`).
- Dodatkowe kontrole kontekstowe:
  - dostęp nauczyciela do klasy/subjectu
  - dostęp wychowawcy do klasy/ucznia

## CORS/CSRF i rate limit
- CORS/CSRF: brak niestandardowych ustawień w repozytorium (Wymaga potwierdzenia).
- Rate limit: wyłączony w `Caddyfile` (komentarz o 429).
- Limit rozmiaru request body: `2MB` w `Caddyfile`.

## Rekomendacje
- Wymuś silny `NEXTAUTH_SECRET` w produkcji.
- Rozważ przywrócenie `rate_limit` w Caddy lub dodanie limitów po stronie aplikacji.
- Dodaj audyt logów i monitoring dostępu (brak w kodzie).

## Jak zweryfikować
- Autoryzacja: `lib/auth.ts`, `lib/permissions.ts`, `middleware.ts`.
- Konfiguracja Caddy: `Caddyfile`.
