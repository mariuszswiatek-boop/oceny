"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type User = {
  id: string
  firstName: string
  lastName: string
  roles: Array<"ADMIN" | "TEACHER" | "HOMEROOM" | "READONLY">
}

type Subject = { id: string; name: string }
type SchoolYear = { id: string; name: string; isActive: boolean }
type ClassItem = { id: string; name: string; schoolYearId: string; schoolYear?: SchoolYear }

type Assignment = {
  id: string
  teacherId: string
  classId: string
  subjectId: string
  schoolYearId: string
  isActive: boolean
  teacher: User
  class: ClassItem
  subject: Subject
  schoolYear: SchoolYear
}

const fieldClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"

export default function AdminAssignmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [editedAssignments, setEditedAssignments] = useState<Record<string, Assignment>>({})
  const [editingAssignments, setEditingAssignments] = useState<Record<string, boolean>>({})
  const [users, setUsers] = useState<User[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    schoolYearId: "",
    classId: "",
    teacherId: "",
    subjectId: "",
  })
  const [newAssignment, setNewAssignment] = useState({
    schoolYearId: "",
    classId: "",
    teacherId: "",
    subjectId: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && !session?.user.roles?.includes("ADMIN")) {
      router.push("/unauthorized")
    }
  }, [status, session, router])

  const teachers = useMemo(() => users.filter((u) => u.roles.includes("TEACHER")), [users])

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [assignmentsRes, usersRes, subjectsRes, classesRes, yearsRes] = await Promise.all([
        fetch(`/api/admin/teacher-assignments?${new URLSearchParams(filters as any).toString()}`),
        fetch("/api/admin/users"),
        fetch("/api/admin/subjects"),
        fetch("/api/admin/classes"),
        fetch("/api/admin/school-years"),
      ])
      if (
        !assignmentsRes.ok ||
        !usersRes.ok ||
        !subjectsRes.ok ||
        !classesRes.ok ||
        !yearsRes.ok
      ) {
        throw new Error("Nie udało się pobrać danych")
      }
      const [assignments, users, subjects, classes, years] = await Promise.all([
        assignmentsRes.json(),
        usersRes.json(),
        subjectsRes.json(),
        classesRes.json(),
        yearsRes.json(),
      ])
      setAssignments(assignments)
      setEditedAssignments(
        Object.fromEntries(assignments.map((assignment: Assignment) => [assignment.id, assignment]))
      )
      setEditingAssignments(
        Object.fromEntries(assignments.map((assignment: Assignment) => [assignment.id, false]))
      )
      setUsers(users)
      setSubjects(subjects)
      setClasses(classes)
      setSchoolYears(years)
      if (!newAssignment.schoolYearId && years[0]?.id) {
        setNewAssignment((prev) => ({ ...prev, schoolYearId: years[0].id }))
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

  const handleCreate = async () => {
    setError(null)
    const res = await fetch("/api/admin/teacher-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAssignment, isActive: true }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd zapisu")
      return
    }
    await loadAll()
  }

  const handleUpdate = async (id: string, payload: Record<string, any>) => {
    setError(null)
    const res = await fetch(`/api/admin/teacher-assignments/${id}`, {
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

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno usunąć przypisanie?")) return
    setError(null)
    const res = await fetch(`/api/admin/teacher-assignments/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd usuwania")
      return
    }
    await loadAll()
  }

  const updateEditedAssignment = (id: string, patch: Partial<Assignment>) => {
    setEditedAssignments((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? assignments.find((a) => a.id === id)!), ...patch },
    }))
  }

  const handleSaveAssignment = async (id: string) => {
    const edited = editedAssignments[id]
    if (!edited) return
    const isUuid = (value: string | undefined) =>
      typeof value === "string" && /^[0-9a-fA-F-]{36}$/.test(value)
    const payload = {
      teacherId: isUuid(edited.teacherId) ? edited.teacherId : undefined,
      classId: isUuid(edited.classId) ? edited.classId : undefined,
      subjectId: isUuid(edited.subjectId) ? edited.subjectId : undefined,
      schoolYearId: isUuid(edited.schoolYearId) ? edited.schoolYearId : undefined,
      isActive: edited.isActive,
    }
    await handleUpdate(id, payload)
    setEditingAssignments((prev) => ({ ...prev, [id]: false }))
  }

  const handleCancelAssignment = (id: string) => {
    const original = assignments.find((assignment) => assignment.id === id)
    if (!original) return
    setEditedAssignments((prev) => ({ ...prev, [id]: original }))
    setEditingAssignments((prev) => ({ ...prev, [id]: false }))
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
            <h1 className="text-3xl font-bold text-gray-900">Przypisania nauczycieli</h1>
            <p className="mt-2 text-sm text-gray-600">Filtruj i zarządzaj przypisaniami.</p>
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
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <select
              className={fieldClass}
              value={filters.schoolYearId}
              onChange={(e) => setFilters({ ...filters, schoolYearId: e.target.value })}
            >
              <option value="">Rok szkolny</option>
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
            >
              <option value="">Klasa</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} ({classItem.schoolYear?.name})
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={filters.teacherId}
              onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}
            >
              <option value="">Nauczyciel</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
            >
              <option value="">Przedmiot</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadAll}
            className="mt-3 rounded bg-gray-900 px-3 py-2 text-sm text-white"
          >
            Zastosuj filtry
          </button>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-slate-900">Dodaj przypisanie</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <select
              className={fieldClass}
              value={newAssignment.schoolYearId}
              onChange={(e) => setNewAssignment({ ...newAssignment, schoolYearId: e.target.value })}
            >
              <option value="">Rok szkolny</option>
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={newAssignment.classId}
              onChange={(e) => setNewAssignment({ ...newAssignment, classId: e.target.value })}
            >
              <option value="">Klasa</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} ({classItem.schoolYear?.name})
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={newAssignment.teacherId}
              onChange={(e) => setNewAssignment({ ...newAssignment, teacherId: e.target.value })}
            >
              <option value="">Nauczyciel</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={newAssignment.subjectId}
              onChange={(e) => setNewAssignment({ ...newAssignment, subjectId: e.target.value })}
            >
              <option value="">Przedmiot</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            className="mt-3 rounded bg-gray-900 px-3 py-2 text-sm text-white"
          >
            Dodaj przypisanie
          </button>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-slate-900">Lista przypisań</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Nauczyciel</th>
                  <th>Rok</th>
                  <th>Klasa</th>
                  <th>Przedmiot</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-t">
                    <td className="py-2 text-slate-900">
                      {editingAssignments[assignment.id] ? (
                        <select
                          className={fieldClass}
                          value={editedAssignments[assignment.id]?.teacherId ?? assignment.teacherId}
                          onChange={(e) =>
                            updateEditedAssignment(assignment.id, { teacherId: e.target.value })
                          }
                        >
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.firstName} {teacher.lastName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          {assignment.teacher.firstName} {assignment.teacher.lastName}
                        </>
                      )}
                    </td>
                    <td className="text-slate-900">
                      {editingAssignments[assignment.id] ? (
                        <select
                          className={fieldClass}
                          value={editedAssignments[assignment.id]?.schoolYearId ?? assignment.schoolYearId}
                          onChange={(e) =>
                            updateEditedAssignment(assignment.id, { schoolYearId: e.target.value })
                          }
                        >
                          {schoolYears.map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        assignment.schoolYear.name
                      )}
                    </td>
                    <td className="text-slate-900">
                      {editingAssignments[assignment.id] ? (
                        <select
                          className={fieldClass}
                          value={editedAssignments[assignment.id]?.classId ?? assignment.classId}
                          onChange={(e) =>
                            updateEditedAssignment(assignment.id, { classId: e.target.value })
                          }
                        >
                          {classes.map((classItem) => (
                            <option key={classItem.id} value={classItem.id}>
                              {classItem.name} ({classItem.schoolYear?.name ?? "-"})
                            </option>
                          ))}
                        </select>
                      ) : (
                        assignment.class.name
                      )}
                    </td>
                    <td className="text-slate-900">
                      {editingAssignments[assignment.id] ? (
                        <select
                          className={fieldClass}
                          value={editedAssignments[assignment.id]?.subjectId ?? assignment.subjectId}
                          onChange={(e) =>
                            updateEditedAssignment(assignment.id, { subjectId: e.target.value })
                          }
                        >
                          {subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        assignment.subject.name
                      )}
                    </td>
                    <td>
                      {editingAssignments[assignment.id] ? (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editedAssignments[assignment.id]?.isActive ?? assignment.isActive}
                            onChange={(e) =>
                              updateEditedAssignment(assignment.id, { isActive: e.target.checked })
                            }
                          />
                          {editedAssignments[assignment.id]?.isActive ?? assignment.isActive
                            ? "Aktywne"
                            : "Archiwalne"}
                        </label>
                      ) : (
                        <span className={assignment.isActive ? "text-green-600" : "text-gray-500"}>
                          {assignment.isActive ? "Aktywne" : "Archiwalne"}
                        </span>
                      )}
                    </td>
                    <td className="flex gap-2 py-2">
                      {editingAssignments[assignment.id] ? (
                        <>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleSaveAssignment(assignment.id)}
                          >
                            Zapisz
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => handleCancelAssignment(assignment.id)}
                          >
                            Anuluj
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            setEditingAssignments((prev) => ({ ...prev, [assignment.id]: true }))
                          }
                        >
                          Edytuj
                        </button>
                      )}
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() =>
                          handleUpdate(assignment.id, {
                            isActive: !assignment.isActive,
                          })
                        }
                      >
                        {assignment.isActive ? "Archiwizuj" : "Aktywuj"}
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
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
