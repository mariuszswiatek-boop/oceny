"use client"

import { useEffect, useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Class {
  id: string
  name: string
  schoolYear: {
    name: string
  }
  _count: {
    students: number
  }
}

export default function NauczycielPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)

  const handleSignOut = async () => {
    // #region agent log
    try {
      fetch("http://127.0.0.1:7245/ingest/45a9926a-fc4d-4c4f-a999-61cb01468485", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "app/nauczyciel/page.tsx:27",
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
          location: "app/nauczyciel/page.tsx:41",
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

    if (status === "authenticated" && session?.user.role !== "NAUCZYCIEL") {
      router.push("/unauthorized")
      return
    }

    if (status === "authenticated") {
      fetchClasses()
    }
  }, [status, session, router])

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/nauczyciel/classes")
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
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
            <h1 className="text-3xl font-bold text-gray-900">Moje klasy</h1>
            <p className="mt-2 text-gray-600">
              Wybierz klasę, aby wprowadzić oceny
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            Wyloguj
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">Nie masz przypisanych żadnych klas.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {classes.map((class_) => (
              <Link
                key={class_.id}
                href={`/nauczyciel/classes/${class_.id}`}
                className="block rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg"
              >
                <h2 className="text-xl font-semibold text-gray-900">{class_.name}</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Rok szkolny: {class_.schoolYear.name}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Uczniów: {class_._count.students}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
