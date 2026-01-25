"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type AuditLog = {
  id: string
  createdAt: string
  actorId: string | null
  actorEmail: string | null
  actorRoles: string[]
  action: string
  entityType: string
  entityId: string | null
  entityLabel: string | null
  ip: string | null
  userAgent: string | null
  success: boolean
  metadata: unknown
}

const fieldClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"

export default function AdminLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [filters, setFilters] = useState({
    q: "",
    action: "",
    entityType: "",
    success: "",
    from: "",
    to: "",
  })

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  )

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && !session?.user.roles?.includes("ADMIN")) {
      router.push("/unauthorized")
    }
  }, [status, session, router])

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("pageSize", String(pageSize))
    if (filters.q) params.set("q", filters.q)
    if (filters.action) params.set("action", filters.action)
    if (filters.entityType) params.set("entityType", filters.entityType)
    if (filters.success) params.set("success", filters.success)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    try {
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Błąd ładowania")
      }
      const data = await res.json()
      setLogs(data.items || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      setError(e.message || "Błąd ładowania")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const handleApplyFilters = () => {
    setPage(1)
    loadLogs()
  }

  const handleSignOut = async () => {
    const result = await signOut({ redirect: false, callbackUrl: "/login" })
    if (result?.url) {
      router.push(result.url)
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Logi audytu</h1>
            <p className="mt-2 text-sm text-gray-600">Wyszukuj i filtruj zdarzenia.</p>
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
          <h2 className="text-xl font-semibold text-slate-900">Filtry</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input
              className={fieldClass}
              placeholder="Szukaj (użytkownik, akcja, obiekt)"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Akcja (np. admin.user.update)"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Typ obiektu (np. user, class)"
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            />
            <select
              className={fieldClass}
              value={filters.success}
              onChange={(e) => setFilters({ ...filters, success: e.target.value })}
            >
              <option value="">Status</option>
              <option value="true">Sukces</option>
              <option value="false">Błąd</option>
            </select>
            <input
              className={fieldClass}
              type="datetime-local"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
            <input
              className={fieldClass}
              type="datetime-local"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleApplyFilters}
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Zastosuj filtry
            </button>
            <button
              onClick={loadLogs}
              className="rounded border px-3 py-2 text-sm text-gray-700"
            >
              Odśwież
            </button>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <div>
              Wyniki: {total}
            </div>
            <div className="flex items-center gap-2">
              <span>Na stronę:</span>
              <select
                className={fieldClass}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
              >
                {[25, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Czas</th>
                  <th>Użytkownik</th>
                  <th>Akcja</th>
                  <th>Obiekt</th>
                  <th>Status</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="py-2">
                      {new Date(log.createdAt).toLocaleString("pl-PL")}
                    </td>
                    <td>
                      {log.actorEmail || log.actorId || "-"}
                    </td>
                    <td>{log.action}</td>
                    <td>
                      <div className="text-xs text-slate-500">{log.entityType}</div>
                      <div>{log.entityLabel || log.entityId || "-"}</div>
                    </td>
                    <td>
                      <span className={log.success ? "text-green-600" : "text-red-600"}>
                        {log.success ? "OK" : "Błąd"}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{log.ip ?? "-"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={6}>
                      Brak danych
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <button
              className="rounded border px-3 py-1 disabled:opacity-50"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              ← Poprzednia
            </button>
            <span>
              Strona {page} z {totalPages}
            </span>
            <button
              className="rounded border px-3 py-1 disabled:opacity-50"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Następna →
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
