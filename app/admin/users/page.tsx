"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "ADMIN" | "TEACHER" | "HOMEROOM" | "READONLY"
  isActive: boolean
}

const fieldClass =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "TEACHER" as User["role"],
    isActive: true,
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && session?.user.role !== "ADMIN") {
      router.push("/unauthorized")
    }
  }, [status, session, router])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Nie udało się pobrać użytkowników")
      setUsers(await res.json())
    } catch (e: any) {
      setError(e.message || "Błąd")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreate = async () => {
    setError(null)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd zapisu")
      return
    }
    setNewUser({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "TEACHER",
      isActive: true,
    })
    await loadUsers()
  }

  const handleUpdate = async (id: string, payload: Record<string, any>) => {
    setError(null)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd zapisu")
      return
    }
    await loadUsers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno usunąć?")) return
    setError(null)
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd usuwania")
      return
    }
    await loadUsers()
  }

  const handleSignOut = async () => {
    const result = await signOut({ redirect: false, callbackUrl: "/login" })
    if (result?.url) router.push(result.url)
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
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Użytkownicy</h1>
            <p className="mt-2 text-sm text-gray-600">Zarządzanie rolami i kontami.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="rounded border px-3 py-2 text-sm">
              Panel główny
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              Wyloguj
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900">Dodaj użytkownika</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input
              className={fieldClass}
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Imię"
              value={newUser.firstName}
              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Nazwisko"
              value={newUser.lastName}
              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
            />
            <input
              className={fieldClass}
              type="password"
              placeholder="Hasło (min 6)"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
            <select
              className={fieldClass}
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User["role"] })}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="TEACHER">TEACHER</option>
              <option value="HOMEROOM">HOMEROOM</option>
              <option value="READONLY">READONLY</option>
            </select>
            <button
              onClick={handleCreate}
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Dodaj
            </button>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900">Lista użytkowników</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Użytkownik</th>
                  <th>Email</th>
                  <th>Rola</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="py-2">
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={user.isActive ? "text-green-600" : "text-gray-500"}>
                        {user.isActive ? "Aktywny" : "Zablokowany"}
                      </span>
                    </td>
                    <td className="flex flex-wrap gap-2 py-2">
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => handleUpdate(user.id, { isActive: !user.isActive })}
                      >
                        {user.isActive ? "Dezaktywuj" : "Aktywuj"}
                      </button>
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => {
                          const password = prompt("Nowe hasło (min 6 znaków):")
                          if (!password) return
                          handleUpdate(user.id, { password })
                        }}
                      >
                        Reset hasła
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                        onClick={() => handleDelete(user.id)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={5}>
                      Brak danych
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
