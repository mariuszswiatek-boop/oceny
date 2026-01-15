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
          data: { role: session?.user?.role ?? null },
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
            error: result?.error ?? null,
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

    if (status === "authenticated" && session?.user.role !== "ADMIN") {
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
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900">Słowniki</h2>
            <p className="mt-2 text-sm text-gray-600">
              Zarządzanie przedmiotami, klasami, skalą ocen i rokiem szkolnym
            </p>
            <p className="mt-4 text-sm text-gray-500">
              (Funkcjonalność w przygotowaniu)
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900">Użytkownicy</h2>
            <p className="mt-2 text-sm text-gray-600">
              Zarządzanie nauczycielami i przypisaniami
            </p>
            <p className="mt-4 text-sm text-gray-500">
              (Funkcjonalność w przygotowaniu)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
