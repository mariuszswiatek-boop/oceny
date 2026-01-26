"use client"

import { useEffect } from "react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    // #region agent log
    try {
      fetch("http://127.0.0.1:7245/ingest/45a9926a-fc4d-4c4f-a999-61cb01468485", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "app/admin/page.tsx:14",
          message: "Sign out start",
          data: { roles: session?.user?.roles ?? null },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "A",
        }),
      }).catch(() => {})
    } catch (e) {}
    // #endregion

    const result = await signOut({ redirect: false, callbackUrl: "/login" })

    // #region agent log
    try {
      fetch("http://127.0.0.1:7245/ingest/45a9926a-fc4d-4c4f-a999-61cb01468485", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "app/admin/page.tsx:28",
          message: "Sign out result",
          data: {
            url: result?.url ?? null,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "B",
        }),
      }).catch(() => {})
    } catch (e) {}
    // #endregion

    if (result?.url) {
      router.push(result.url)
      router.refresh()
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && !session?.user.roles?.includes("ADMIN")) {
      router.push("/unauthorized")
      return
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Ładowanie...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel Administratora</h1>
            <p className="mt-2 text-gray-600">
              Zarządzanie systemem
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            Wyloguj
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/settings" className="rounded-lg bg-white p-6 shadow hover:shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">Ustawienia / Słowniki</h2>
            <p className="mt-2 text-sm text-gray-600">
              Rok szkolny, klasy, przedmioty, skala ocen.
            </p>
          </Link>
          <Link href="/admin/logs" className="rounded-lg bg-white p-6 shadow hover:shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">Logi audytu</h2>
            <p className="mt-2 text-sm text-gray-600">
              Zdarzenia, zmiany i historia działań.
            </p>
          </Link>
          <Link href="/admin/users" className="rounded-lg bg-white p-6 shadow hover:shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">Użytkownicy</h2>
            <p className="mt-2 text-sm text-gray-600">
              Dodawanie kont, role, reset hasła, blokady.
            </p>
          </Link>
          <Link
            href="/admin/assignments"
            className="rounded-lg bg-white p-6 shadow hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-gray-900">Przypisania</h2>
            <p className="mt-2 text-sm text-gray-600">
              Przedmiot → klasa → nauczyciel → rok szkolny.
            </p>
          </Link>
          <Link href="/admin/students" className="rounded-lg bg-white p-6 shadow hover:shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">Uczniowie i rodzice</h2>
            <p className="mt-2 text-sm text-gray-600">
              Lista uczniów, kontakty rodziców, archiwizacja.
            </p>
          </Link>
          <Link href="/admin/reports" className="rounded-lg bg-white p-6 shadow hover:shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">Raporty</h2>
            <p className="mt-2 text-sm text-gray-600">
              Kompletność ocen, braki i statystyki.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
