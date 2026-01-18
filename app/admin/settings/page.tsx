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
  const [editedSchoolYears, setEditedSchoolYears] = useState<Record<string, SchoolYear>>({})
  const [editedSubjects, setEditedSubjects] = useState<Record<string, Subject>>({})
  const [editedGradeScales, setEditedGradeScales] = useState<Record<string, GradeScale>>({})
  const [editedClasses, setEditedClasses] = useState<Record<string, ClassItem>>({})
  const [editingSchoolYears, setEditingSchoolYears] = useState<Record<string, boolean>>({})
  const [editingSubjects, setEditingSubjects] = useState<Record<string, boolean>>({})
  const [editingGradeScales, setEditingGradeScales] = useState<Record<string, boolean>>({})
  const [editingClasses, setEditingClasses] = useState<Record<string, boolean>>({})
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
      setEditedSchoolYears(Object.fromEntries(years.map((year: SchoolYear) => [year.id, year])))
      setEditedSubjects(Object.fromEntries(subjects.map((subject: Subject) => [subject.id, subject])))
      setEditedGradeScales(
        Object.fromEntries(scales.map((scale: GradeScale) => [scale.id, scale]))
      )
      setEditedClasses(Object.fromEntries(classes.map((classItem: ClassItem) => [classItem.id, classItem])))
      setEditingSchoolYears(Object.fromEntries(years.map((year: SchoolYear) => [year.id, false])))
      setEditingSubjects(Object.fromEntries(subjects.map((subject: Subject) => [subject.id, false])))
      setEditingGradeScales(Object.fromEntries(scales.map((scale: GradeScale) => [scale.id, false])))
      setEditingClasses(Object.fromEntries(classes.map((classItem: ClassItem) => [classItem.id, false])))
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

  const updateEditedSchoolYear = (id: string, patch: Partial<SchoolYear>) => {
    setEditedSchoolYears((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? schoolYears.find((year) => year.id === id)!), ...patch },
    }))
  }

  const updateEditedSubject = (id: string, patch: Partial<Subject>) => {
    setEditedSubjects((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? subjects.find((subject) => subject.id === id)!), ...patch },
    }))
  }

  const updateEditedGradeScale = (id: string, patch: Partial<GradeScale>) => {
    setEditedGradeScales((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? gradeScales.find((scale) => scale.id === id)!), ...patch },
    }))
  }

  const updateEditedClass = (id: string, patch: Partial<ClassItem>) => {
    setEditedClasses((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? classes.find((classItem) => classItem.id === id)!), ...patch },
    }))
  }

  const handleSaveSchoolYear = async (id: string) => {
    const edited = editedSchoolYears[id]
    if (!edited) return
    await handleUpdate(`/api/admin/school-years/${id}`, {
      name: edited.name,
      startDate: edited.startDate || null,
      endDate: edited.endDate || null,
      sortOrder: edited.sortOrder,
      gradingTerm: edited.gradingTerm,
      isGradingOpen: edited.isGradingOpen,
    })
    setEditingSchoolYears((prev) => ({ ...prev, [id]: false }))
  }

  const handleSaveSubject = async (id: string) => {
    const edited = editedSubjects[id]
    if (!edited) return
    await handleUpdate(`/api/admin/subjects/${id}`, {
      name: edited.name,
      sortOrder: edited.sortOrder,
      isActive: edited.isActive,
    })
    setEditingSubjects((prev) => ({ ...prev, [id]: false }))
  }

  const handleSaveGradeScale = async (id: string) => {
    const edited = editedGradeScales[id]
    if (!edited) return
    await handleUpdate(`/api/admin/grade-scales/${id}`, {
      label: edited.label,
      colorHex: edited.colorHex,
      sortOrder: edited.sortOrder,
      isActive: edited.isActive,
    })
    setEditingGradeScales((prev) => ({ ...prev, [id]: false }))
  }

  const handleSaveClass = async (id: string) => {
    const edited = editedClasses[id]
    if (!edited) return
    await handleUpdate(`/api/admin/classes/${id}`, {
      name: edited.name,
      schoolYearId: edited.schoolYearId,
      teacherId: edited.teacherId || null,
      sortOrder: edited.sortOrder,
      isActive: edited.isActive,
    })
    setEditingClasses((prev) => ({ ...prev, [id]: false }))
  }

  const handleCancelSchoolYear = (id: string) => {
    const original = schoolYears.find((year) => year.id === id)
    if (!original) return
    setEditedSchoolYears((prev) => ({ ...prev, [id]: original }))
    setEditingSchoolYears((prev) => ({ ...prev, [id]: false }))
  }

  const handleCancelSubject = (id: string) => {
    const original = subjects.find((subject) => subject.id === id)
    if (!original) return
    setEditedSubjects((prev) => ({ ...prev, [id]: original }))
    setEditingSubjects((prev) => ({ ...prev, [id]: false }))
  }

  const handleCancelGradeScale = (id: string) => {
    const original = gradeScales.find((scale) => scale.id === id)
    if (!original) return
    setEditedGradeScales((prev) => ({ ...prev, [id]: original }))
    setEditingGradeScales((prev) => ({ ...prev, [id]: false }))
  }

  const handleCancelClass = (id: string) => {
    const original = classes.find((classItem) => classItem.id === id)
    if (!original) return
    setEditedClasses((prev) => ({ ...prev, [id]: original }))
    setEditingClasses((prev) => ({ ...prev, [id]: false }))
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
                    <td className="py-2">
                      {editingSchoolYears[year.id] ? (
                        <input
                          className={fieldClass}
                          value={editedSchoolYears[year.id]?.name ?? year.name}
                          onChange={(e) =>
                            updateEditedSchoolYear(year.id, { name: e.target.value })
                          }
                        />
                      ) : (
                        year.name
                      )}
                    </td>
                    <td>
                      {editingSchoolYears[year.id] ? (
                        <input
                          className={fieldClass}
                          type="date"
                          value={editedSchoolYears[year.id]?.startDate ?? year.startDate ?? ""}
                          onChange={(e) =>
                            updateEditedSchoolYear(year.id, { startDate: e.target.value })
                          }
                        />
                      ) : (
                        year.startDate ? year.startDate.slice(0, 10) : "-"
                      )}
                    </td>
                    <td>
                      {editingSchoolYears[year.id] ? (
                        <input
                          className={fieldClass}
                          type="date"
                          value={editedSchoolYears[year.id]?.endDate ?? year.endDate ?? ""}
                          onChange={(e) =>
                            updateEditedSchoolYear(year.id, { endDate: e.target.value })
                          }
                        />
                      ) : (
                        year.endDate ? year.endDate.slice(0, 10) : "-"
                      )}
                    </td>
                    <td>
                      {editingSchoolYears[year.id] ? (
                        <input
                          className={fieldClass}
                          type="number"
                          value={editedSchoolYears[year.id]?.sortOrder ?? year.sortOrder}
                          onChange={(e) =>
                            updateEditedSchoolYear(year.id, { sortOrder: Number(e.target.value) })
                          }
                        />
                      ) : (
                        year.sortOrder
                      )}
                    </td>
                    <td>
                      {editingSchoolYears[year.id] ? (
                        <select
                          className={fieldClass}
                          value={editedSchoolYears[year.id]?.gradingTerm ?? year.gradingTerm}
                          onChange={(e) =>
                            updateEditedSchoolYear(year.id, {
                              gradingTerm: e.target.value as SchoolYear["gradingTerm"],
                            })
                          }
                          disabled={!year.isActive}
                        >
                        <option value="MIDYEAR">Śródroczna</option>
                        <option value="FINAL">Końcoworoczna</option>
                        </select>
                      ) : year.gradingTerm === "MIDYEAR" ? (
                        "Śródroczna"
                      ) : (
                        "Końcoworoczna"
                      )}
                    </td>
                    <td>
                      {editingSchoolYears[year.id] ? (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editedSchoolYears[year.id]?.isGradingOpen ?? year.isGradingOpen}
                            onChange={(e) =>
                              updateEditedSchoolYear(year.id, { isGradingOpen: e.target.checked })
                            }
                            disabled={!year.isActive}
                          />
                          {editedSchoolYears[year.id]?.isGradingOpen ?? year.isGradingOpen
                            ? "Odblokowane"
                            : "Zablokowane"}
                        </label>
                      ) : year.isGradingOpen ? (
                        "Odblokowane"
                      ) : (
                        "Zablokowane"
                      )}
                    </td>
                    <td>
                      <span className={year.isActive ? "text-green-600" : "text-gray-500"}>
                        {year.isActive ? "Aktywny" : "Archiwalny"}
                      </span>
                    </td>
                    <td className="flex gap-2 py-2">
                      {editingSchoolYears[year.id] ? (
                        <>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleSaveSchoolYear(year.id)}
                          >
                            Zapisz
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleCancelSchoolYear(year.id)}
                          >
                            Anuluj
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            setEditingSchoolYears((prev) => ({ ...prev, [year.id]: true }))
                          }
                        >
                          Edytuj
                        </button>
                      )}
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
                    <td className="py-2">
                      {editingSubjects[subject.id] ? (
                        <input
                          className={fieldClass}
                          value={editedSubjects[subject.id]?.name ?? subject.name}
                          onChange={(e) =>
                            updateEditedSubject(subject.id, { name: e.target.value })
                          }
                        />
                      ) : (
                        subject.name
                      )}
                    </td>
                    <td>
                      {editingSubjects[subject.id] ? (
                        <input
                          className={fieldClass}
                          type="number"
                          value={editedSubjects[subject.id]?.sortOrder ?? subject.sortOrder}
                          onChange={(e) =>
                            updateEditedSubject(subject.id, { sortOrder: Number(e.target.value) })
                          }
                        />
                      ) : (
                        subject.sortOrder
                      )}
                    </td>
                    <td>
                      {editingSubjects[subject.id] ? (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editedSubjects[subject.id]?.isActive ?? subject.isActive}
                            onChange={(e) =>
                              updateEditedSubject(subject.id, { isActive: e.target.checked })
                            }
                          />
                          {editedSubjects[subject.id]?.isActive ?? subject.isActive
                            ? "Aktywny"
                            : "Archiwalny"}
                        </label>
                      ) : (
                        <span className={subject.isActive ? "text-green-600" : "text-gray-500"}>
                          {subject.isActive ? "Aktywny" : "Archiwalny"}
                        </span>
                      )}
                    </td>
                    <td className="flex gap-2 py-2">
                      {editingSubjects[subject.id] ? (
                        <>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleSaveSubject(subject.id)}
                          >
                            Zapisz
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleCancelSubject(subject.id)}
                          >
                            Anuluj
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            setEditingSubjects((prev) => ({ ...prev, [subject.id]: true }))
                          }
                        >
                          Edytuj
                        </button>
                      )}
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
                    <td className="py-2">
                      {editingGradeScales[scale.id] ? (
                        <input
                          className={fieldClass}
                          value={editedGradeScales[scale.id]?.label ?? scale.label}
                          onChange={(e) =>
                            updateEditedGradeScale(scale.id, { label: e.target.value })
                          }
                        />
                      ) : (
                        scale.label
                      )}
                    </td>
                    <td>
                      {editingGradeScales[scale.id] ? (
                        <input
                          className={fieldClass}
                          type="color"
                          value={editedGradeScales[scale.id]?.colorHex ?? scale.colorHex}
                          onChange={(e) =>
                            updateEditedGradeScale(scale.id, { colorHex: e.target.value })
                          }
                        />
                      ) : (
                        <span
                          className="inline-flex h-5 w-8 rounded"
                          style={{ backgroundColor: scale.colorHex }}
                        />
                      )}
                    </td>
                    <td>
                      {editingGradeScales[scale.id] ? (
                        <input
                          className={fieldClass}
                          type="number"
                          value={editedGradeScales[scale.id]?.sortOrder ?? scale.sortOrder}
                          onChange={(e) =>
                            updateEditedGradeScale(scale.id, { sortOrder: Number(e.target.value) })
                          }
                        />
                      ) : (
                        scale.sortOrder
                      )}
                    </td>
                    <td>
                      {editingGradeScales[scale.id] ? (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editedGradeScales[scale.id]?.isActive ?? scale.isActive}
                            onChange={(e) =>
                              updateEditedGradeScale(scale.id, { isActive: e.target.checked })
                            }
                          />
                          {editedGradeScales[scale.id]?.isActive ?? scale.isActive
                            ? "Aktywna"
                            : "Archiwalna"}
                        </label>
                      ) : (
                        <span className={scale.isActive ? "text-green-600" : "text-gray-500"}>
                          {scale.isActive ? "Aktywna" : "Archiwalna"}
                        </span>
                      )}
                    </td>
                    <td className="flex gap-2 py-2">
                      {editingGradeScales[scale.id] ? (
                        <>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleSaveGradeScale(scale.id)}
                          >
                            Zapisz
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleCancelGradeScale(scale.id)}
                          >
                            Anuluj
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            setEditingGradeScales((prev) => ({ ...prev, [scale.id]: true }))
                          }
                        >
                          Edytuj
                        </button>
                      )}
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
                    <td className="py-2">
                      {editingClasses[classItem.id] ? (
                        <input
                          className={fieldClass}
                          value={editedClasses[classItem.id]?.name ?? classItem.name}
                          onChange={(e) =>
                            updateEditedClass(classItem.id, { name: e.target.value })
                          }
                        />
                      ) : (
                        classItem.name
                      )}
                    </td>
                    <td>
                      {editingClasses[classItem.id] ? (
                        <select
                          className={fieldClass}
                          value={
                            editedClasses[classItem.id]?.schoolYearId ?? classItem.schoolYearId
                          }
                          onChange={(e) =>
                            updateEditedClass(classItem.id, { schoolYearId: e.target.value })
                          }
                        >
                          {schoolYears.map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        classItem.schoolYear?.name ?? "-"
                      )}
                    </td>
                    <td>
                      {editingClasses[classItem.id] ? (
                        <select
                          className={fieldClass}
                          value={editedClasses[classItem.id]?.teacherId ?? classItem.teacherId ?? ""}
                          onChange={(e) =>
                            updateEditedClass(classItem.id, {
                              teacherId: e.target.value || null,
                            })
                          }
                        >
                          <option value="">Brak</option>
                          {homeroomTeachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.firstName} {teacher.lastName}
                            </option>
                          ))}
                        </select>
                      ) : classItem.teacher ? (
                        `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {editingClasses[classItem.id] ? (
                        <input
                          className={fieldClass}
                          type="number"
                          value={editedClasses[classItem.id]?.sortOrder ?? classItem.sortOrder}
                          onChange={(e) =>
                            updateEditedClass(classItem.id, { sortOrder: Number(e.target.value) })
                          }
                        />
                      ) : (
                        classItem.sortOrder
                      )}
                    </td>
                    <td>
                      {editingClasses[classItem.id] ? (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editedClasses[classItem.id]?.isActive ?? classItem.isActive}
                            onChange={(e) =>
                              updateEditedClass(classItem.id, { isActive: e.target.checked })
                            }
                          />
                          {editedClasses[classItem.id]?.isActive ?? classItem.isActive
                            ? "Aktywna"
                            : "Archiwalna"}
                        </label>
                      ) : (
                        <span className={classItem.isActive ? "text-green-600" : "text-gray-500"}>
                          {classItem.isActive ? "Aktywna" : "Archiwalna"}
                        </span>
                      )}
                    </td>
                    <td className="flex gap-2 py-2">
                      {editingClasses[classItem.id] ? (
                        <>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleSaveClass(classItem.id)}
                          >
                            Zapisz
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleCancelClass(classItem.id)}
                          >
                            Anuluj
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            setEditingClasses((prev) => ({ ...prev, [classItem.id]: true }))
                          }
                        >
                          Edytuj
                        </button>
                      )}
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
