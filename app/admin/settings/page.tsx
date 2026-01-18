"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type SchoolYear = {
  id: string
  name: string
  isActive: boolean
  gradingTerm: "MIDYEAR" | "FINAL"
  isGradingOpen: boolean
  sortOrder: number
  startDate: string | null
  endDate: string | null
}

type Subject = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

type GradeScale = {
  id: string
  label: string
  colorHex: string
  sortOrder: number
  isActive: boolean
}

type User = {
  id: string
  firstName: string
  lastName: string
  role: "ADMIN" | "TEACHER" | "HOMEROOM" | "READONLY"
}

type ClassItem = {
  id: string
  name: string
  schoolYearId: string
  teacherId: string | null
  sortOrder: number
  isActive: boolean
  schoolYear?: SchoolYear
  teacher?: User | null
}

const fieldClass =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newSchoolYear, setNewSchoolYear] = useState({
    name: "",
    startDate: "",
    endDate: "",
    sortOrder: 1,
    isActive: true,
  })
  const [newSubject, setNewSubject] = useState({ name: "", sortOrder: 1, isActive: true })
  const [newGradeScale, setNewGradeScale] = useState({
    label: "",
    colorHex: "#FF0000",
    sortOrder: 1,
    isActive: true,
  })
  const [newClass, setNewClass] = useState({
    name: "",
    schoolYearId: "",
    teacherId: "",
    sortOrder: 1,
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

  const homeroomTeachers = useMemo(
    () => users.filter((u) => u.role === "HOMEROOM"),
    [users]
  )

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [yearsRes, subjectsRes, scalesRes, classesRes, usersRes] = await Promise.all([
        fetch("/api/admin/school-years"),
        fetch("/api/admin/subjects"),
        fetch("/api/admin/grade-scales"),
        fetch("/api/admin/classes"),
        fetch("/api/admin/users"),
      ])
      if (!yearsRes.ok || !subjectsRes.ok || !scalesRes.ok || !classesRes.ok || !usersRes.ok) {
        throw new Error("Nie udało się pobrać danych")
      }
      const [years, subjects, scales, classes, users] = await Promise.all([
        yearsRes.json(),
        subjectsRes.json(),
        scalesRes.json(),
        classesRes.json(),
        usersRes.json(),
      ])
      setSchoolYears(years)
      setSubjects(subjects)
      setGradeScales(scales)
      setClasses(classes)
      setUsers(users)
      if (!newClass.schoolYearId && years[0]?.id) {
        setNewClass((prev) => ({ ...prev, schoolYearId: years[0].id }))
      }
    } catch (e: any) {
      setError(e.message || "Błąd ładowania")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignOut = async () => {
    const result = await signOut({ redirect: false, callbackUrl: "/login" })
    if (result?.url) {
      router.push(result.url)
    }
  }

  const handleCreate = async (
    url: string,
    payload: Record<string, any>,
    reset: () => void
  ) => {
    setError(null)
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd zapisu")
      return
    }
    reset()
    await loadAll()
  }

  const handleUpdate = async (url: string, payload: Record<string, any>) => {
    setError(null)
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd zapisu")
      return
    }
    await loadAll()
  }

  const handleDelete = async (url: string) => {
    if (!confirm("Na pewno usunąć?")) return
    setError(null)
    const res = await fetch(url, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd usuwania")
      return
    }
    await loadAll()
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
            <h1 className="text-3xl font-bold text-gray-900">Ustawienia / Słowniki</h1>
            <p className="mt-2 text-sm text-slate-700">
              Zarządzaj rokiem szkolnym, klasami, przedmiotami i skalą ocen.
            </p>
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
          <h2 className="text-xl font-semibold text-slate-900">Rok szkolny</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-5">
            <input
              className={fieldClass}
              placeholder="2025/2026"
              value={newSchoolYear.name}
              onChange={(e) => setNewSchoolYear({ ...newSchoolYear, name: e.target.value })}
            />
            <input
              className={fieldClass}
              type="date"
              value={newSchoolYear.startDate}
              onChange={(e) => setNewSchoolYear({ ...newSchoolYear, startDate: e.target.value })}
            />
            <input
              className={fieldClass}
              type="date"
              value={newSchoolYear.endDate}
              onChange={(e) => setNewSchoolYear({ ...newSchoolYear, endDate: e.target.value })}
            />
            <input
              className={fieldClass}
              type="number"
              value={newSchoolYear.sortOrder}
              onChange={(e) =>
                setNewSchoolYear({ ...newSchoolYear, sortOrder: Number(e.target.value) })
              }
            />
            <button
              onClick={() =>
                handleCreate("/api/admin/school-years", newSchoolYear, () =>
                  setNewSchoolYear({ name: "", startDate: "", endDate: "", sortOrder: 1, isActive: true })
                )
              }
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Dodaj
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Nazwa</th>
                  <th>Start</th>
                  <th>Koniec</th>
                  <th>Sort</th>
                  <th>Okres ocen</th>
                  <th>Edycja</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {schoolYears.map((year) => (
                  <tr key={year.id} className="border-t">
                    <td className="py-2">{year.name}</td>
                    <td>{year.startDate ? year.startDate.slice(0, 10) : "-"}</td>
                    <td>{year.endDate ? year.endDate.slice(0, 10) : "-"}</td>
                    <td>{year.sortOrder}</td>
                    <td>
                      <select
                        className={fieldClass}
                        value={year.gradingTerm}
                        onChange={(e) =>
                          handleUpdate(`/api/admin/school-years/${year.id}`, {
                            gradingTerm: e.target.value,
                          })
                        }
                        disabled={!year.isActive}
                      >
                        <option value="MIDYEAR">Po semestrze</option>
                        <option value="FINAL">Koniec roku</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className={`rounded border px-2 py-1 text-xs ${
                          year.isGradingOpen
                            ? "border-green-200 text-green-700"
                            : "border-gray-200 text-gray-600"
                        }`}
                        onClick={() =>
                          handleUpdate(`/api/admin/school-years/${year.id}`, {
                            isGradingOpen: !year.isGradingOpen,
                          })
                        }
                        disabled={!year.isActive}
                      >
                        {year.isGradingOpen ? "Odblokowane" : "Zablokowane"}
                      </button>
                    </td>
                    <td>
                      <span className={year.isActive ? "text-green-600" : "text-gray-500"}>
                        {year.isActive ? "Aktywny" : "Archiwalny"}
                      </span>
                    </td>
                    <td className="flex gap-2 py-2">
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() =>
                          handleUpdate(`/api/admin/school-years/${year.id}`, {
                            isActive: !year.isActive,
                          })
                        }
                      >
                        {year.isActive ? "Archiwizuj" : "Aktywuj"}
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                        onClick={() => handleDelete(`/api/admin/school-years/${year.id}`)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
                {schoolYears.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={8}>
                      Brak danych
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-900">Przedmioty</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <input
              className={fieldClass}
              placeholder="Nowy przedmiot"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
            />
            <input
              className={fieldClass}
              type="number"
              value={newSubject.sortOrder}
              onChange={(e) => setNewSubject({ ...newSubject, sortOrder: Number(e.target.value) })}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newSubject.isActive}
                onChange={(e) => setNewSubject({ ...newSubject, isActive: e.target.checked })}
              />
              <span className="text-sm">Aktywny</span>
            </div>
            <button
              onClick={() =>
                handleCreate("/api/admin/subjects", newSubject, () =>
                  setNewSubject({ name: "", sortOrder: 1, isActive: true })
                )
              }
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Dodaj
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Nazwa</th>
                  <th>Sort</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="border-t">
                    <td className="py-2">{subject.name}</td>
                    <td>{subject.sortOrder}</td>
                    <td>
                      <span className={subject.isActive ? "text-green-600" : "text-gray-500"}>
                        {subject.isActive ? "Aktywny" : "Archiwalny"}
                      </span>
                    </td>
                    <td className="flex gap-2 py-2">
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() =>
                          handleUpdate(`/api/admin/subjects/${subject.id}`, {
                            isActive: !subject.isActive,
                          })
                        }
                      >
                        {subject.isActive ? "Archiwizuj" : "Aktywuj"}
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                        onClick={() => handleDelete(`/api/admin/subjects/${subject.id}`)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
                {subjects.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={4}>
                      Brak danych
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-900">Skala Montessori</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <input
              className={fieldClass}
              placeholder="Label"
              value={newGradeScale.label}
              onChange={(e) => setNewGradeScale({ ...newGradeScale, label: e.target.value })}
            />
            <input
              className={fieldClass}
              type="color"
              value={newGradeScale.colorHex}
              onChange={(e) => setNewGradeScale({ ...newGradeScale, colorHex: e.target.value })}
            />
            <input
              className={fieldClass}
              type="number"
              value={newGradeScale.sortOrder}
              onChange={(e) =>
                setNewGradeScale({ ...newGradeScale, sortOrder: Number(e.target.value) })
              }
            />
            <button
              onClick={() =>
                handleCreate("/api/admin/grade-scales", newGradeScale, () =>
                  setNewGradeScale({ label: "", colorHex: "#FF0000", sortOrder: 1, isActive: true })
                )
              }
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Dodaj
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Label</th>
                  <th>Kolor</th>
                  <th>Sort</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {gradeScales.map((scale) => (
                  <tr key={scale.id} className="border-t">
                    <td className="py-2">{scale.label}</td>
                    <td>
                      <span
                        className="inline-flex h-5 w-8 rounded"
                        style={{ backgroundColor: scale.colorHex }}
                      />
                    </td>
                    <td>{scale.sortOrder}</td>
                    <td>
                      <span className={scale.isActive ? "text-green-600" : "text-gray-500"}>
                        {scale.isActive ? "Aktywna" : "Archiwalna"}
                      </span>
                    </td>
                    <td className="flex gap-2 py-2">
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() =>
                          handleUpdate(`/api/admin/grade-scales/${scale.id}`, {
                            isActive: !scale.isActive,
                          })
                        }
                      >
                        {scale.isActive ? "Archiwizuj" : "Aktywuj"}
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                        onClick={() => handleDelete(`/api/admin/grade-scales/${scale.id}`)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
                {gradeScales.length === 0 && (
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

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-900">Klasy</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-5">
            <input
              className={fieldClass}
              placeholder="np. 3A"
              value={newClass.name}
              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
            />
            <select
              className={fieldClass}
              value={newClass.schoolYearId}
              onChange={(e) => setNewClass({ ...newClass, schoolYearId: e.target.value })}
            >
              <option value="">Wybierz rok</option>
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={newClass.teacherId}
              onChange={(e) => setNewClass({ ...newClass, teacherId: e.target.value })}
            >
              <option value="">Wychowawca</option>
              {homeroomTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
            <input
              className={fieldClass}
              type="number"
              value={newClass.sortOrder}
              onChange={(e) => setNewClass({ ...newClass, sortOrder: Number(e.target.value) })}
            />
            <button
              onClick={() =>
                handleCreate(
                  "/api/admin/classes",
                  {
                    ...newClass,
                    teacherId: newClass.teacherId || null,
                  },
                  () =>
                    setNewClass({
                      name: "",
                      schoolYearId: schoolYears[0]?.id ?? "",
                      teacherId: "",
                      sortOrder: 1,
                      isActive: true,
                    })
                )
              }
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Dodaj
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Klasa</th>
                  <th>Rok</th>
                  <th>Wychowawca</th>
                  <th>Sort</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {classes.map((classItem) => (
                  <tr key={classItem.id} className="border-t">
                    <td className="py-2">{classItem.name}</td>
                    <td>{classItem.schoolYear?.name ?? "-"}</td>
                    <td>
                      {classItem.teacher
                        ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                        : "-"}
                    </td>
                    <td>{classItem.sortOrder}</td>
                    <td>
                      <span className={classItem.isActive ? "text-green-600" : "text-gray-500"}>
                        {classItem.isActive ? "Aktywna" : "Archiwalna"}
                      </span>
                    </td>
                    <td className="flex gap-2 py-2">
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() =>
                          handleUpdate(`/api/admin/classes/${classItem.id}`, {
                            isActive: !classItem.isActive,
                          })
                        }
                      >
                        {classItem.isActive ? "Archiwizuj" : "Aktywuj"}
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                        onClick={() => handleDelete(`/api/admin/classes/${classItem.id}`)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
                {classes.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={6}>
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
