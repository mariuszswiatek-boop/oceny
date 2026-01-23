# ADR 0001: Wybór stacku aplikacji

## Spis treści
- [Status](#status)
- [Kontekst](#kontekst)
- [Decyzja](#decyzja)
- [Konsekwencje](#konsekwencje)
- [Jak zweryfikować](#jak-zweryfikowac)

## Status
Obowiązująca.

## Kontekst
Repozytorium zawiera aplikację webową z UI i API, której wymagania obejmują:
- UI + API w jednym repo,
- relacyjną bazę danych,
- generowanie PDF,
- uwierzytelnianie po rolach.

## Decyzja
Stos technologiczny:
- Next.js (App Router) + TypeScript (`package.json`, `app/`).
- Prisma jako ORM (`prisma/schema.prisma`, `@prisma/client`).
- PostgreSQL jako baza danych (`prisma/schema.prisma`).
- NextAuth Credentials do logowania (`lib/auth.ts`).
- Playwright/Chromium do generowania PDF (`lib/pdf/playwright.ts`).

## Konsekwencje
- Jedna aplikacja obsługuje zarówno frontend, jak i API.
- Wymagane środowisko z PostgreSQL i Chromium.
- Migracje i seed zarządzane przez Prisma.

## Jak zweryfikować
- `package.json` oraz `prisma/schema.prisma`.
