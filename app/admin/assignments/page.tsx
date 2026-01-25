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
type ClassItem = {
  id: string
  name: string
  schoolYearId: string
  teacherId?: string | null
  schoolYear?: SchoolYear
}

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

type AssignmentGroup = {
  key: string
  teacherId: string
  classId: string
  schoolYearId: string
  teacher: User
  class: ClassItem
  schoolYear: SchoolYear
  subjects: Array<{ id: string; name: string; assignmentId: string; isActive: boolean }>
  isActive: boolean
}

type HomeroomGroup = {
  key: string
  teacher: User
  schoolYear: SchoolYear
  classes: ClassItem[]
}

const fieldClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"

export default function AdminAssignmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [editedGroups, setEditedGroups] = useState<
    Record<string, { subjectIds: string[]; isActive: boolean }>
  >({})
  const [editingGroups, setEditingGroups] = useState<Record<string, boolean>>({})
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
    subjectIds: [] as string[],
  })
  const [homeroomAssignment, setHomeroomAssignment] = useState({
    schoolYearId: "",
    teacherId: "",
    classIds: [] as string[],
    mode: "assign" as "assign" | "clear",
  })
  const [listQuery, setListQuery] = useState("")
  const [listGroupBy, setListGroupBy] = useState<"teacher" | "class" | "year" | "none">("teacher")
  const [listSortBy, setListSortBy] = useState<"teacher" | "class" | "year" | "subject">("teacher")

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
  const homeroomTeachers = useMemo(
    () => users.filter((u) => u.roles.includes("HOMEROOM")),
    [users]
  )
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])

  const homeroomGroups = useMemo(() => {
    const map = new Map<string, HomeroomGroup>()
    for (const classItem of classes) {
      if (!classItem.teacherId) continue
      if (homeroomAssignment.schoolYearId && classItem.schoolYearId !== homeroomAssignment.schoolYearId) {
        continue
      }
      const teacher = usersById.get(classItem.teacherId)
      const schoolYear = classItem.schoolYear
      if (!teacher || !schoolYear) continue
      const key = `${teacher.id}|${schoolYear.id}`
      const existing = map.get(key)
      if (existing) {
        existing.classes.push(classItem)
      } else {
        map.set(key, { key, teacher, schoolYear, classes: [classItem] })
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const lastName = a.teacher.lastName.localeCompare(b.teacher.lastName)
      if (lastName !== 0) return lastName
      const firstName = a.teacher.firstName.localeCompare(b.teacher.firstName)
      if (firstName !== 0) return firstName
      return a.schoolYear.name.localeCompare(b.schoolYear.name)
    })
  }, [classes, homeroomAssignment.schoolYearId, usersById])

  const groupAssignments = (items: Assignment[]) => {
    const map = new Map<string, AssignmentGroup>()
    for (const assignment of items) {
      const key = `${assignment.teacherId}|${assignment.classId}|${assignment.schoolYearId}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          key,
          teacherId: assignment.teacherId,
          classId: assignment.classId,
          schoolYearId: assignment.schoolYearId,
          teacher: assignment.teacher,
          class: assignment.class,
          schoolYear: assignment.schoolYear,
          subjects: [
            {
              id: assignment.subjectId,
              name: assignment.subject.name,
              assignmentId: assignment.id,
              isActive: assignment.isActive,
            },
          ],
          isActive: assignment.isActive,
        })
      } else {
        existing.subjects.push({
          id: assignment.subjectId,
          name: assignment.subject.name,
          assignmentId: assignment.id,
          isActive: assignment.isActive,
        })
        existing.isActive = existing.isActive && assignment.isActive
      }
    }
    return Array.from(map.values())
  }

  const assignmentGroups = useMemo(() => groupAssignments(assignments), [assignments])

  const visibleGroups = useMemo(() => {
    const query = listQuery.trim().toLocaleLowerCase()
    const filtered = query
      ? assignmentGroups.filter((group) => {
          const teacher = `${group.teacher.firstName} ${group.teacher.lastName}`.toLocaleLowerCase()
          const className = group.class.name.toLocaleLowerCase()
          const yearName = group.schoolYear.name.toLocaleLowerCase()
          const subjectNames = group.subjects.map((s) => s.name.toLocaleLowerCase()).join(" ")
          return [teacher, className, yearName, subjectNames].some((value) => value.includes(query))
        })
      : assignmentGroups

    const sorted = [...filtered].sort((a, b) => {
      const teacherA = `${a.teacher.lastName} ${a.teacher.firstName}`
      const teacherB = `${b.teacher.lastName} ${b.teacher.firstName}`
      const classA = a.class.name
      const classB = b.class.name
      const yearA = a.schoolYear.name
      const yearB = b.schoolYear.name
      const subjectA = a.subjects.map((s) => s.name).sort().join(", ")
      const subjectB = b.subjects.map((s) => s.name).sort().join(", ")
      if (listSortBy === "teacher") return teacherA.localeCompare(teacherB)
      if (listSortBy === "class") return classA.localeCompare(classB)
      if (listSortBy === "year") return yearA.localeCompare(yearB)
      return subjectA.localeCompare(subjectB)
    })

    const grouped = new Map<string, { label: string; items: AssignmentGroup[] }>()
    for (const group of sorted) {
      let key = "all"
      let label = "Wszystkie przypisania"
      if (listGroupBy === "teacher") {
        key = group.teacherId
        label = `${group.teacher.firstName} ${group.teacher.lastName}`
      } else if (listGroupBy === "class") {
        key = `${group.classId}|${group.schoolYearId}`
        label = `${group.class.name} (${group.schoolYear.name})`
      } else if (listGroupBy === "year") {
        key = group.schoolYearId
        label = group.schoolYear.name
      }
      const bucket = grouped.get(key)
      if (bucket) {
        bucket.items.push(group)
      } else {
        grouped.set(key, { label, items: [group] })
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [assignmentGroups, listQuery, listGroupBy, listSortBy])

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
      const groups = groupAssignments(assignments)
      setEditedGroups(
        Object.fromEntries(
          groups.map((group) => [
            group.key,
            { subjectIds: group.subjects.map((s) => s.id), isActive: group.isActive },
          ])
        )
      )
      setEditingGroups(Object.fromEntries(groups.map((group) => [group.key, false])))
      setUsers(users)
      setSubjects(subjects)
      setClasses(classes)
      setSchoolYears(years)
      if (!newAssignment.schoolYearId && years[0]?.id) {
        setNewAssignment((prev) => ({ ...prev, schoolYearId: years[0].id }))
      }
      if (!homeroomAssignment.schoolYearId && years[0]?.id) {
        setHomeroomAssignment((prev) => ({ ...prev, schoolYearId: years[0].id }))
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
    if (!newAssignment.subjectIds.length) {
      setError("Wybierz przynajmniej jeden przedmiot")
      return
    }
    for (const subjectId of newAssignment.subjectIds) {
      const res = await fetch("/api/admin/teacher-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolYearId: newAssignment.schoolYearId,
          classId: newAssignment.classId,
          teacherId: newAssignment.teacherId,
          subjectId,
          isActive: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Błąd zapisu")
        return
      }
    }
    await loadAll()
  }

  const handleAssignHomeroom = async () => {
    setError(null)
    if (!homeroomAssignment.teacherId) {
      setError("Wybierz wychowawcę")
      return
    }
    if (!homeroomAssignment.classIds.length) {
      setError("Wybierz przynajmniej jedną klasę")
      return
    }

    for (const classId of homeroomAssignment.classIds) {
      const res = await fetch(`/api/admin/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: homeroomAssignment.mode === "assign" ? homeroomAssignment.teacherId : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Błąd zapisu")
        return
      }
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

  const handleSaveGroup = async (group: AssignmentGroup) => {
    const edited = editedGroups[group.key]
    if (!edited) return

    const currentSubjectIds = new Set(group.subjects.map((s) => s.id))
    const nextSubjectIds = new Set(edited.subjectIds)

    const toAdd = edited.subjectIds.filter((id) => !currentSubjectIds.has(id))
    const toRemove = group.subjects.filter((s) => !nextSubjectIds.has(s.id))

    for (const subjectId of toAdd) {
      const res = await fetch("/api/admin/teacher-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: group.teacherId,
          classId: group.classId,
          schoolYearId: group.schoolYearId,
          subjectId,
          isActive: edited.isActive,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Błąd zapisu")
        return
      }
    }

    for (const subject of toRemove) {
      const res = await fetch(`/api/admin/teacher-assignments/${subject.assignmentId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Błąd usuwania")
        return
      }
    }

    if (edited.isActive !== group.isActive) {
      for (const subject of group.subjects) {
        await handleUpdate(subject.assignmentId, { isActive: edited.isActive })
      }
    } else {
      await loadAll()
    }

    setEditingGroups((prev) => ({ ...prev, [group.key]: false }))
  }

  const handleCancelGroup = (group: AssignmentGroup) => {
    setEditedGroups((prev) => ({
      ...prev,
      [group.key]: { subjectIds: group.subjects.map((s) => s.id), isActive: group.isActive },
    }))
    setEditingGroups((prev) => ({ ...prev, [group.key]: false }))
  }

  const updateEditedGroup = (key: string, patch: Partial<{ subjectIds: string[]; isActive: boolean }>) => {
    setEditedGroups((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { subjectIds: [], isActive: true }), ...patch },
    }))
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
            <div className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700">
              <div className="mb-2 text-xs font-semibold text-slate-600">Przedmioty</div>
              <div className="grid max-h-40 gap-1 overflow-y-auto">
                {subjects.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAssignment.subjectIds.includes(subject.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...newAssignment.subjectIds, subject.id]))
                          : newAssignment.subjectIds.filter((id) => id !== subject.id)
                        setNewAssignment({ ...newAssignment, subjectIds: next })
                      }}
                    />
                    {subject.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-3 rounded bg-gray-900 px-3 py-2 text-sm text-white"
          >
            Dodaj przypisanie
          </button>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-900">
            Przypisz klasy do wychowawcy
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <select
              className={fieldClass}
              value={homeroomAssignment.schoolYearId}
              onChange={(e) =>
                setHomeroomAssignment({ ...homeroomAssignment, schoolYearId: e.target.value })
              }
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
              value={homeroomAssignment.teacherId}
              onChange={(e) =>
                setHomeroomAssignment({ ...homeroomAssignment, teacherId: e.target.value })
              }
            >
              <option value="">Wychowawca</option>
              {homeroomTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
            <div className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700">
              <div className="mb-2 text-xs font-semibold text-slate-600">Klasy</div>
              <div className="grid max-h-40 gap-1 overflow-y-auto">
                {classes
                  .filter((classItem) =>
                    homeroomAssignment.schoolYearId
                      ? classItem.schoolYearId === homeroomAssignment.schoolYearId
                      : true
                  )
                  .map((classItem) => (
                    <label key={classItem.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={homeroomAssignment.classIds.includes(classItem.id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...homeroomAssignment.classIds, classItem.id]))
                            : homeroomAssignment.classIds.filter((id) => id !== classItem.id)
                          setHomeroomAssignment({ ...homeroomAssignment, classIds: next })
                        }}
                      />
                      {classItem.name} ({classItem.schoolYear?.name ?? "-"})
                    </label>
                  ))}
              </div>
            </div>
            <div className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700">
              <div className="mb-2 text-xs font-semibold text-slate-600">Tryb</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="homeroom-mode"
                  checked={homeroomAssignment.mode === "assign"}
                  onChange={() =>
                    setHomeroomAssignment({ ...homeroomAssignment, mode: "assign" })
                  }
                />
                Przypisz
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="homeroom-mode"
                  checked={homeroomAssignment.mode === "clear"}
                  onChange={() =>
                    setHomeroomAssignment({ ...homeroomAssignment, mode: "clear" })
                  }
                />
                Usuń przypisanie
              </label>
            </div>
          </div>
          <button
            onClick={handleAssignHomeroom}
            className="mt-3 rounded bg-gray-900 px-3 py-2 text-sm text-white"
          >
            Zapisz przypisania
          </button>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              Wychowawcy i klasy
            </h2>
            <div className="text-sm text-slate-500">
              {homeroomAssignment.schoolYearId
                ? `Rok: ${schoolYears.find((y) => y.id === homeroomAssignment.schoolYearId)?.name ?? "-"}`
                : "Wszystkie lata"}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Wychowawca</th>
                  <th>Rok</th>
                  <th>Klasy</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {homeroomGroups.map((group) => (
                  <tr key={group.key} className="border-t">
                    <td className="py-2">
                      {group.teacher.firstName} {group.teacher.lastName}
                    </td>
                    <td>{group.schoolYear.name}</td>
                    <td>
                      {group.classes
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((classItem) => classItem.name)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
                {homeroomGroups.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={3}>
                      Brak przypisań wychowawców
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Lista przypisań</h2>
            <div className="flex flex-wrap gap-2">
              <input
                className={fieldClass}
                placeholder="Szukaj (nauczyciel, klasa, rok, przedmiot)"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
              />
              <select
                className={fieldClass}
                value={listGroupBy}
                onChange={(e) => setListGroupBy(e.target.value as typeof listGroupBy)}
              >
                <option value="teacher">Grupuj: Nauczyciel</option>
                <option value="class">Grupuj: Klasa</option>
                <option value="year">Grupuj: Rok</option>
                <option value="none">Bez grupowania</option>
              </select>
              <select
                className={fieldClass}
                value={listSortBy}
                onChange={(e) => setListSortBy(e.target.value as typeof listSortBy)}
              >
                <option value="teacher">Sortuj: Nauczyciel</option>
                <option value="class">Sortuj: Klasa</option>
                <option value="year">Sortuj: Rok</option>
                <option value="subject">Sortuj: Przedmiot</option>
              </select>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Nauczyciel</th>
                  <th>Rok</th>
                  <th>Klasa</th>
                  <th>Przedmioty</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {visibleGroups.flatMap((section) => {
                  const rows = section.items.map((group) => (
                    <tr key={group.key} className="border-t">
                      <td className="py-2 text-slate-900">
                        {group.teacher.firstName} {group.teacher.lastName}
                      </td>
                      <td className="text-slate-900">
                        {group.schoolYear.name}
                      </td>
                      <td className="text-slate-900">
                        {group.class.name}
                      </td>
                      <td className="text-slate-900">
                        {editingGroups[group.key] ? (
                          <div className="grid max-h-40 gap-1 overflow-y-auto rounded border border-gray-300 bg-white px-2 py-2 text-sm">
                            {subjects.map((subject) => (
                              <label key={subject.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={(editedGroups[group.key]?.subjectIds ?? []).includes(
                                    subject.id
                                  )}
                                  onChange={(e) => {
                                    const current = editedGroups[group.key]?.subjectIds ?? []
                                    const next = e.target.checked
                                      ? Array.from(new Set([...current, subject.id]))
                                      : current.filter((id) => id !== subject.id)
                                    updateEditedGroup(group.key, { subjectIds: next })
                                  }}
                                />
                                {subject.name}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {group.subjects
                              .slice()
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((subject) => (
                                <span
                                  key={subject.assignmentId}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700"
                                >
                                  {subject.name}
                                  <button
                                    className="rounded-full px-1 text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(subject.assignmentId)}
                                    title="Usuń przypisanie"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {editingGroups[group.key] ? (
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={editedGroups[group.key]?.isActive ?? group.isActive}
                              onChange={(e) =>
                                updateEditedGroup(group.key, { isActive: e.target.checked })
                              }
                            />
                            {editedGroups[group.key]?.isActive ?? group.isActive
                              ? "Aktywne"
                              : "Archiwalne"}
                          </label>
                        ) : (
                          <span className={group.isActive ? "text-green-600" : "text-gray-500"}>
                            {group.isActive ? "Aktywne" : "Archiwalne"}
                          </span>
                        )}
                      </td>
                      <td className="flex gap-2 py-2">
                        {editingGroups[group.key] ? (
                          <>
                            <button
                              className="rounded border px-2 py-1 text-xs"
                              onClick={() => handleSaveGroup(group)}
                            >
                              Zapisz
                            </button>
                            <button
                              className="rounded border px-2 py-1 text-xs"
                              onClick={() => handleCancelGroup(group)}
                            >
                              Anuluj
                            </button>
                          </>
                        ) : (
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() =>
                              setEditingGroups((prev) => ({ ...prev, [group.key]: true }))
                            }
                          >
                            Edytuj
                          </button>
                        )}
                      </td>
                    </tr>
                  ))

                  if (listGroupBy === "none") {
                    return rows
                  }

                  return [
                    <tr key={`${section.label}-header`} className="bg-slate-50">
                      <td colSpan={6} className="py-2 text-sm font-semibold text-slate-700">
                        {section.label}
                      </td>
                    </tr>,
                    ...rows,
                  ]
                })}
                {visibleGroups.length === 0 && (
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
