"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type ClassItem = {
  id: string
  name: string
  schoolYear?: { id: string; name: string }
}

type Student = {
  id: string
  firstName: string
  lastName: string
  classId: string
  isActive: boolean
  class?: ClassItem
}

type ParentContact = {
  id: string
  studentId: string
  email: string
  fullName?: string | null
  phone?: string | null
  isPrimary: boolean
}

const fieldClass =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"

export default function AdminStudentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [contacts, setContacts] = useState<ParentContact[]>([])
  const [editedStudents, setEditedStudents] = useState<Record<string, Student>>({})
  const [editedContacts, setEditedContacts] = useState<Record<string, ParentContact>>({})
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [filters, setFilters] = useState({ classId: "" })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStudent, setNewStudent] = useState({ firstName: "", lastName: "", classId: "" })
  const [newContact, setNewContact] = useState({
    email: "",
    fullName: "",
    phone: "",
    isPrimary: false,
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

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [studentsRes, classesRes] = await Promise.all([
        fetch(`/api/admin/students?${new URLSearchParams(filters as any).toString()}`),
        fetch("/api/admin/classes"),
      ])
      if (!studentsRes.ok || !classesRes.ok) {
        throw new Error("Nie udało się pobrać danych")
      }
      const [students, classes] = await Promise.all([studentsRes.json(), classesRes.json()])
      setStudents(students)
      setClasses(classes)
      setEditedStudents(Object.fromEntries(students.map((student: Student) => [student.id, student])))
      if (!newStudent.classId && classes[0]?.id) {
        setNewStudent((prev) => ({ ...prev, classId: classes[0].id }))
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

  const loadContacts = async (studentId: string) => {
    setError(null)
    const res = await fetch(`/api/admin/parent-contacts?studentId=${studentId}`)
    if (!res.ok) {
      setError("Nie udało się pobrać kontaktów")
      return
    }
    const data = await res.json()
    setContacts(data)
    setEditedContacts(Object.fromEntries(data.map((contact: ParentContact) => [contact.id, contact])))
  }

  const handleCreateStudent = async () => {
    setError(null)
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newStudent, isActive: true }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd zapisu")
      return
    }
    setNewStudent({ firstName: "", lastName: "", classId: newStudent.classId })
    await loadAll()
  }

  const handleUpdateStudent = async (id: string, payload: Record<string, any>) => {
    setError(null)
    const res = await fetch(`/api/admin/students/${id}`, {
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

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Na pewno usunąć ucznia?")) return
    setError(null)
    const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd usuwania")
      return
    }
    await loadAll()
  }

  const handleCreateContact = async () => {
    if (!selectedStudent) return
    setError(null)
    const res = await fetch("/api/admin/parent-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newContact, studentId: selectedStudent.id }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd zapisu")
      return
    }
    setNewContact({ email: "", fullName: "", phone: "", isPrimary: false })
    await loadContacts(selectedStudent.id)
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Usunąć kontakt?")) return
    setError(null)
    const res = await fetch(`/api/admin/parent-contacts/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd usuwania")
      return
    }
    if (selectedStudent) {
      await loadContacts(selectedStudent.id)
    }
  }

  const updateEditedStudent = (id: string, patch: Partial<Student>) => {
    setEditedStudents((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? students.find((s) => s.id === id)!), ...patch },
    }))
  }

  const updateEditedContact = (id: string, patch: Partial<ParentContact>) => {
    setEditedContacts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? contacts.find((c) => c.id === id)!), ...patch },
    }))
  }

  const handleSaveStudent = async (id: string) => {
    const edited = editedStudents[id]
    if (!edited) return
    await handleUpdateStudent(id, {
      firstName: edited.firstName,
      lastName: edited.lastName,
      classId: edited.classId,
      isActive: edited.isActive,
    })
  }

  const handleSaveContact = async (id: string) => {
    const edited = editedContacts[id]
    if (!edited) return
    const res = await fetch(`/api/admin/parent-contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: edited.email,
        fullName: edited.fullName ?? null,
        phone: edited.phone ?? null,
        isPrimary: edited.isPrimary,
        studentId: edited.studentId,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Błąd zapisu")
      return
    }
    if (selectedStudent) {
      await loadContacts(selectedStudent.id)
    }
  }

  const handleSignOut = async () => {
    const result = await signOut({ redirect: false, callbackUrl: "/login" })
    if (result?.url) router.push(result.url)
  }

  const classOptions = useMemo(
    () =>
      classes.map((classItem) => ({
        value: classItem.id,
        label: `${classItem.name} (${classItem.schoolYear?.name ?? "-"})`,
      })),
    [classes]
  )

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
            <h1 className="text-3xl font-bold text-gray-900">Uczniowie i kontakty</h1>
            <p className="mt-2 text-sm text-gray-600">Zarządzaj uczniami i kontaktami rodziców.</p>
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
            <select
              className={fieldClass}
              value={filters.classId}
              onChange={(e) => setFilters({ classId: e.target.value })}
            >
              <option value="">Klasa</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={loadAll}
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Zastosuj
            </button>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-900">Dodaj ucznia</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <input
              className={fieldClass}
              placeholder="Imię"
              value={newStudent.firstName}
              onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
            />
            <input
              className={fieldClass}
              placeholder="Nazwisko"
              value={newStudent.lastName}
              onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
            />
            <select
              className={fieldClass}
              value={newStudent.classId}
              onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
            >
              <option value="">Klasa</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateStudent}
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Dodaj
            </button>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-900">Lista uczniów</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2">Uczeń</th>
                  <th>Klasa</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {students.map((student) => (
                  <tr key={student.id} className="border-t">
                    <td className="py-2 text-slate-900">
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          className={fieldClass}
                          value={editedStudents[student.id]?.firstName ?? student.firstName}
                          onChange={(e) =>
                            updateEditedStudent(student.id, { firstName: e.target.value })
                          }
                          placeholder="Imię"
                        />
                        <input
                          className={fieldClass}
                          value={editedStudents[student.id]?.lastName ?? student.lastName}
                          onChange={(e) =>
                            updateEditedStudent(student.id, { lastName: e.target.value })
                          }
                          placeholder="Nazwisko"
                        />
                      </div>
                    </td>
                    <td className="text-slate-900">
                      <select
                        className={fieldClass}
                        value={editedStudents[student.id]?.classId ?? student.classId}
                        onChange={(e) =>
                          updateEditedStudent(student.id, { classId: e.target.value })
                        }
                      >
                        {classOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editedStudents[student.id]?.isActive ?? student.isActive}
                          onChange={(e) =>
                            updateEditedStudent(student.id, { isActive: e.target.checked })
                          }
                        />
                        {editedStudents[student.id]?.isActive ?? student.isActive
                          ? "Aktywny"
                          : "Archiwalny"}
                      </label>
                    </td>
                    <td className="flex flex-wrap gap-2 py-2">
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => handleSaveStudent(student.id)}
                      >
                        Zapisz
                      </button>
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => handleUpdateStudent(student.id, { isActive: !student.isActive })}
                      >
                        {student.isActive ? "Archiwizuj" : "Aktywuj"}
                      </button>
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => {
                          setSelectedStudent(student)
                          loadContacts(student.id)
                        }}
                      >
                        Kontakty
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                        onClick={() => handleDeleteStudent(student.id)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
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

        {selectedStudent && (
          <section className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Kontakty rodziców: {selectedStudent.firstName} {selectedStudent.lastName}
              </h2>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={() => setSelectedStudent(null)}
              >
                Zamknij
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <input
                className={fieldClass}
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              />
              <input
                className={fieldClass}
                placeholder="Imię i nazwisko"
                value={newContact.fullName}
                onChange={(e) => setNewContact({ ...newContact, fullName: e.target.value })}
              />
              <input
                className={fieldClass}
                placeholder="Telefon"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newContact.isPrimary}
                  onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                />
                Główny
              </label>
              <button
                onClick={handleCreateContact}
                className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
              >
                Dodaj kontakt
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                    <th className="py-2">Email</th>
                    <th>Kontakt</th>
                    <th>Telefon</th>
                    <th>Główny</th>
                    <th>Uczeń</th>
                    <th></th>
                  </tr>
                </thead>
              <tbody className="text-slate-900">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="border-t">
                    <td className="py-2 text-slate-900">
                        <input
                          className={fieldClass}
                          value={editedContacts[contact.id]?.email ?? contact.email}
                          onChange={(e) =>
                            updateEditedContact(contact.id, { email: e.target.value })
                          }
                          placeholder="Email"
                        />
                      </td>
                    <td className="text-slate-900">
                        <input
                          className={fieldClass}
                          value={editedContacts[contact.id]?.fullName ?? contact.fullName ?? ""}
                          onChange={(e) =>
                            updateEditedContact(contact.id, { fullName: e.target.value })
                          }
                          placeholder="Imię i nazwisko"
                        />
                      </td>
                    <td className="text-slate-900">
                        <input
                          className={fieldClass}
                          value={editedContacts[contact.id]?.phone ?? contact.phone ?? ""}
                          onChange={(e) =>
                            updateEditedContact(contact.id, { phone: e.target.value })
                          }
                          placeholder="Telefon"
                        />
                      </td>
                      <td>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editedContacts[contact.id]?.isPrimary ?? contact.isPrimary}
                            onChange={(e) =>
                              updateEditedContact(contact.id, { isPrimary: e.target.checked })
                            }
                          />
                          {editedContacts[contact.id]?.isPrimary ?? contact.isPrimary ? "Tak" : "Nie"}
                        </label>
                      </td>
                      <td>
                        <select
                          className={fieldClass}
                          value={editedContacts[contact.id]?.studentId ?? contact.studentId}
                          onChange={(e) =>
                            updateEditedContact(contact.id, { studentId: e.target.value })
                          }
                        >
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.firstName} {student.lastName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() => handleSaveContact(contact.id)}
                        >
                          Zapisz
                        </button>
                        <button
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          Usuń
                        </button>
                      </td>
                    </tr>
                  ))}
                  {contacts.length === 0 && (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={6}>
                        Brak kontaktów
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
