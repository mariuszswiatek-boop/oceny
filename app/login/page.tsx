"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Nieprawidłowy email lub hasło")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("Wystąpił błąd podczas logowania")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-[var(--foreground)]">
            System Ocen Montessori
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--muted)]">
            Zaloguj się do systemu
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--muted)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted)] shadow-sm focus:border-[var(--focus)] focus:outline-none focus:ring-[var(--focus)]/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--muted)]">
                Hasło
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted)] shadow-sm focus:border-[var(--focus)] focus:outline-none focus:ring-[var(--focus)]/20"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[var(--focus)] px-4 py-2 text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--focus)]/30 focus:ring-offset-2 focus:ring-offset-[var(--surface)] disabled:opacity-50"
            >
              {loading ? "Logowanie..." : "Zaloguj się"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
