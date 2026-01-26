"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type SchoolYear = { id: string; name: string; isActive: boolean; gradingTerm: "MIDYEAR" | "FINAL" }

type Summary = {
  expected: number
  completed: number
  missing: number
  completion: number
}

type CompletionRow = {
  expected: number
  completed: number
  missing: number
  completion: number
}

type ByClassRow = CompletionRow & { classId: string; className: string }
type BySubjectRow = CompletionRow & { subjectId: string; subjectName: string }
type ByTeacherRow = CompletionRow & { teacherId: string; teacherName: string }
type ByClassSubjectRow = CompletionRow & {
  classId: string
  className: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
}

type MissingStudentRow = {
  studentId: string
  studentName: string
  classId: string
  className: string
  missingCount: number
  subjects: string[]
}

type MissingDetailRow = {
  studentId: string
  studentName: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
}

type ReportData = {
  schoolYear: { id: string; name: string }
  term: "MIDYEAR" | "FINAL"
  summary: Summary
  byClass: ByClassRow[]
  bySubject: BySubjectRow[]
  byTeacher: ByTeacherRow[]
  byClassSubject: ByClassSubjectRow[]
  missingByStudent: MissingStudentRow[]
  missingStudentsTotal: number
  missingStudentsPage: number
  missingStudentsPageSize: number
  missingDetails: MissingDetailRow[]
}

const fieldClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"

const formatSubjects = (subjects: string[]) => {
  if (subjects.length <= 6) return subjects.join(", ")
  return `${subjects.slice(0, 6).join(", ")} +${subjects.length - 6}`
}

const MiniBarChart = ({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; value: number }>
}) => {
  const max = Math.max(1, ...items.map((item) => item.value))
  return (
    <div className="rounded border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {items.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">Brak danych</div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.label} className="grid gap-2 text-sm text-slate-700 md:grid-cols-[160px_1fr_40px]">
              <div className="truncate" title={item.label}>
                {item.label}
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-600"
                  style={{ width: `${Math.round((item.value / max) * 100)}%` }}
                />
              </div>
              <div className="text-right text-slate-500">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([])
  const [selectedYearId, setSelectedYearId] = useState("")
  const [term, setTerm] = useState<"MIDYEAR" | "FINAL">("MIDYEAR")
  const [detailsLoaded, setDetailsLoaded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [studentsOpen, setStudentsOpen] = useState(false)
  const [studentsPage, setStudentsPage] = useState(1)
  const studentsPageSize = 50
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnlyMissing, setShowOnlyMissing] = useState(true)
  const [studentQuery, setStudentQuery] = useState("")
  const [termTouched, setTermTouched] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && !session?.user.roles?.includes("ADMIN")) {
      router.push("/unauthorized")
    }
  }, [status, session, router])

  const loadYears = async () => {
    const res = await fetch("/api/admin/school-years")
    if (!res.ok) {
      throw new Error("Nie udało się pobrać lat szkolnych")
    }
    const data = (await res.json()) as SchoolYear[]
    setSchoolYears(data)
    if (!selectedYearId) {
      const active = data.find((item) => item.isActive) ?? data[0]
      if (active) {
        setSelectedYearId(active.id)
        if (!termTouched) {
          setTerm(active.gradingTerm ?? "MIDYEAR")
        }
      }
    }
  }

  const loadReport = async (
    yearId: string,
    selectedTerm: "MIDYEAR" | "FINAL",
    includeDetails: boolean,
    includeStudents: boolean,
    targetStudentsPage: number
  ) => {
    const params = new URLSearchParams({
      schoolYearId: yearId,
      term: selectedTerm,
      includeDetails: includeDetails ? "true" : "false",
      includeStudents: includeStudents ? "true" : "false",
      studentsPage: String(targetStudentsPage),
      studentsPageSize: String(studentsPageSize),
    })
    const res = await fetch(`/api/admin/reports/grade-completeness?${params.toString()}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Nie udało się pobrać raportu")
    }
    const data = (await res.json()) as ReportData
    setReport(data)
    setTerm(data.term)
  }

  const handleRefresh = async () => {
    if (!selectedYearId) return
    setError(null)
    setLoading(true)
    try {
      await loadReport(selectedYearId, term, detailsLoaded, studentsLoaded, studentsPage)
    } catch (e: any) {
      setError(e.message || "Błąd ładowania")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true)
      setError(null)
      try {
        await loadYears()
      } catch (e: any) {
        setError(e.message || "Błąd ładowania")
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedYearId) return
    setDetailsLoaded(false)
    setDetailsOpen(false)
    setStudentsLoaded(false)
    setStudentsOpen(false)
    setStudentsPage(1)
    handleRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId, term])

  const handleToggleDetails = async () => {
    const nextOpen = !detailsOpen
    setDetailsOpen(nextOpen)
    if (!nextOpen || detailsLoaded || !selectedYearId) return
    setError(null)
    setLoading(true)
    try {
      await loadReport(selectedYearId, term, true, studentsLoaded, studentsPage)
      setDetailsLoaded(true)
    } catch (e: any) {
      setError(e.message || "Błąd ładowania")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStudents = async (open: boolean) => {
    setStudentsOpen(open)
    if (!open || studentsLoaded || !selectedYearId) return
    setError(null)
    setLoading(true)
    try {
      await loadReport(selectedYearId, term, detailsLoaded, true, studentsPage)
      setStudentsLoaded(true)
    } catch (e: any) {
      setError(e.message || "Błąd ładowania")
    } finally {
      setLoading(false)
    }
  }

  const handleStudentsPageChange = async (nextPage: number) => {
    if (!selectedYearId || !studentsLoaded) return
    setStudentsPage(nextPage)
    setError(null)
    setLoading(true)
    try {
      await loadReport(selectedYearId, term, detailsLoaded, true, nextPage)
    } catch (e: any) {
      setError(e.message || "Błąd ładowania")
    } finally {
      setLoading(false)
    }
  }

  const visibleClassSubject = useMemo(() => {
    if (!report) return []
    return showOnlyMissing
      ? report.byClassSubject.filter((row) => row.missing > 0)
      : report.byClassSubject
  }, [report, showOnlyMissing])

  const filteredMissingStudents = useMemo(() => {
    if (!report) return []
    const query = studentQuery.trim().toLowerCase()
    if (!query) return report.missingByStudent
    return report.missingByStudent.filter((row) => {
      return (
        row.studentName.toLowerCase().includes(query) ||
        row.className.toLowerCase().includes(query) ||
        row.subjects.some((subject) => subject.toLowerCase().includes(query))
      )
    })
  }, [report, studentQuery])

  const topMissingClasses = useMemo(() => {
    if (!report) return []
    return [...report.byClass].sort((a, b) => b.missing - a.missing).slice(0, 5)
  }, [report])

  const topMissingSubjects = useMemo(() => {
    if (!report) return []
    return [...report.bySubject].sort((a, b) => b.missing - a.missing).slice(0, 5)
  }, [report])

  const topMissingTeachers = useMemo(() => {
    if (!report) return []
    return [...report.byTeacher].sort((a, b) => b.missing - a.missing).slice(0, 5)
  }, [report])

  const chartClasses = useMemo(
    () => topMissingClasses.map((row) => ({ label: row.className, value: row.missing })),
    [topMissingClasses]
  )
  const chartSubjects = useMemo(
    () => topMissingSubjects.map((row) => ({ label: row.subjectName, value: row.missing })),
    [topMissingSubjects]
  )
  const chartTeachers = useMemo(
    () =>
      topMissingTeachers.map((row) => ({
        label: row.teacherName.split(" ")[0] ?? row.teacherName,
        value: row.missing,
      })),
    [topMissingTeachers]
  )

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
            <h1 className="text-3xl font-bold text-gray-900">Raporty i kompletność ocen</h1>
            <p className="mt-2 text-sm text-gray-600">
              Podsumowania braków ocen w danym roku szkolnym i terminie.
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
          <h2 className="text-xl font-semibold text-slate-900">Filtry</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <select
              className={fieldClass}
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
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
              value={term}
              onChange={(e) => {
                setTermTouched(true)
                setTerm(e.target.value === "FINAL" ? "FINAL" : "MIDYEAR")
              }}
            >
              <option value="MIDYEAR">I semestr</option>
              <option value="FINAL">Koniec roku</option>
            </select>
            <button
              onClick={handleRefresh}
              className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
            >
              Odswiez
            </button>
          </div>
        </section>

        {report && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-xs uppercase text-slate-500">Oczekiwane oceny</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {report.summary.expected}
                </div>
              </div>
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-xs uppercase text-slate-500">Wystawione</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {report.summary.completed}
                </div>
              </div>
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-xs uppercase text-slate-500">Braki</div>
                <div className="mt-2 text-2xl font-semibold text-red-600">
                  {report.summary.missing}
                </div>
              </div>
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-xs uppercase text-slate-500">Kompletnosc</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {report.summary.completion}%
                </div>
              </div>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-xl font-semibold text-slate-900">Największe braki</h2>
              <div className="mt-4 grid gap-6 md:grid-cols-3">
                <div>
                  <div className="text-sm font-semibold text-slate-700">Klasy</div>
                  <div className="mt-3 space-y-2">
                    {topMissingClasses.map((row) => (
                      <div key={row.classId} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span>{row.className}</span>
                          <span className="text-slate-500">{row.missing}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-700"
                            style={{ width: `${row.completion}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {topMissingClasses.length === 0 && (
                      <div className="text-sm text-slate-500">Brak danych</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700">Przedmioty</div>
                  <div className="mt-3 space-y-2">
                    {topMissingSubjects.map((row) => (
                      <div key={row.subjectId} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span>{row.subjectName}</span>
                          <span className="text-slate-500">{row.missing}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-700"
                            style={{ width: `${row.completion}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {topMissingSubjects.length === 0 && (
                      <div className="text-sm text-slate-500">Brak danych</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700">Nauczyciele</div>
                  <div className="mt-3 space-y-2">
                    {topMissingTeachers.map((row) => (
                      <div key={row.teacherId} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span>{row.teacherName}</span>
                          <span className="text-slate-500">{row.missing}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-700"
                            style={{ width: `${row.completion}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {topMissingTeachers.length === 0 && (
                      <div className="text-sm text-slate-500">Brak danych</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <MiniBarChart title="Wykres braków - klasy" items={chartClasses} />
                <MiniBarChart title="Wykres braków - przedmioty" items={chartSubjects} />
                <MiniBarChart title="Wykres braków - nauczyciele" items={chartTeachers} />
              </div>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
              <details>
                <summary className="cursor-pointer text-xl font-semibold text-slate-900">
                  Kompletnosc wedlug klas
                </summary>
                <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-700">
                      <th className="py-2">Klasa</th>
                      <th>Wystawione</th>
                      <th>Oczekiwane</th>
                      <th>Braki</th>
                      <th>Kompletnosc</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-900">
                    {report.byClass.map((row) => (
                      <tr key={row.classId} className="border-t">
                        <td className="py-2">{row.className}</td>
                        <td>{row.completed}</td>
                        <td>{row.expected}</td>
                        <td className={row.missing ? "text-red-600" : "text-slate-700"}>
                          {row.missing}
                        </td>
                        <td>{row.completion}%</td>
                        <td className="text-right">
                          <Link
                            href="/admin/settings#classes"
                            className="text-xs text-blue-700 hover:underline"
                          >
                            Przejdz do klasy
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {report.byClass.length === 0 && (
                      <tr>
                        <td className="py-3 text-gray-500" colSpan={6}>
                          Brak danych
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </details>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
              <details>
                <summary className="cursor-pointer text-xl font-semibold text-slate-900">
                  Kompletnosc wedlug przedmiotow
                </summary>
                <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-700">
                      <th className="py-2">Przedmiot</th>
                      <th>Wystawione</th>
                      <th>Oczekiwane</th>
                      <th>Braki</th>
                      <th>Kompletnosc</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-900">
                    {report.bySubject.map((row) => (
                      <tr key={row.subjectId} className="border-t">
                        <td className="py-2">{row.subjectName}</td>
                        <td>{row.completed}</td>
                        <td>{row.expected}</td>
                        <td className={row.missing ? "text-red-600" : "text-slate-700"}>
                          {row.missing}
                        </td>
                        <td>{row.completion}%</td>
                        <td className="text-right">
                          <Link
                            href="/admin/settings#subjects"
                            className="text-xs text-blue-700 hover:underline"
                          >
                            Przejdz do przedmiotu
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {report.bySubject.length === 0 && (
                      <tr>
                        <td className="py-3 text-gray-500" colSpan={6}>
                          Brak danych
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </details>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
              <details>
                <summary className="cursor-pointer text-xl font-semibold text-slate-900">
                  Kompletnosc wedlug nauczycieli
                </summary>
                <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-700">
                      <th className="py-2">Nauczyciel</th>
                      <th>Wystawione</th>
                      <th>Oczekiwane</th>
                      <th>Braki</th>
                      <th>Kompletnosc</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-900">
                    {report.byTeacher.map((row) => (
                      <tr key={row.teacherId} className="border-t">
                        <td className="py-2">{row.teacherName}</td>
                        <td>{row.completed}</td>
                        <td>{row.expected}</td>
                        <td className={row.missing ? "text-red-600" : "text-slate-700"}>
                          {row.missing}
                        </td>
                        <td>{row.completion}%</td>
                        <td className="text-right">
                          <Link
                            href="/admin/users"
                            className="text-xs text-blue-700 hover:underline"
                          >
                            Przejdz do nauczyciela
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {report.byTeacher.length === 0 && (
                      <tr>
                        <td className="py-3 text-gray-500" colSpan={6}>
                          Brak danych
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </details>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
              <details>
                <summary className="cursor-pointer text-xl font-semibold text-slate-900">
                  Braki: klasa i przedmiot
                </summary>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={showOnlyMissing}
                      onChange={(e) => setShowOnlyMissing(e.target.checked)}
                    />
                    Pokaz tylko z brakami
                  </label>
                </div>
                <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-700">
                      <th className="py-2">Klasa</th>
                      <th>Przedmiot</th>
                      <th>Nauczyciel</th>
                      <th>Wystawione</th>
                      <th>Oczekiwane</th>
                      <th>Braki</th>
                      <th>Kompletnosc</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-900">
                    {visibleClassSubject.map((row) => (
                      <tr key={`${row.classId}-${row.subjectId}`} className="border-t">
                        <td className="py-2">{row.className}</td>
                        <td>{row.subjectName}</td>
                        <td>{row.teacherName}</td>
                        <td>{row.completed}</td>
                        <td>{row.expected}</td>
                        <td className={row.missing ? "text-red-600" : "text-slate-700"}>
                          {row.missing}
                        </td>
                        <td>{row.completion}%</td>
                        <td className="text-right">
                          <Link
                            href="/admin/assignments"
                            className="text-xs text-blue-700 hover:underline"
                          >
                            Przejdz do przypisan
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {visibleClassSubject.length === 0 && (
                      <tr>
                        <td className="py-3 text-gray-500" colSpan={8}>
                          Brak danych
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </details>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
              <details onToggle={(e) => handleToggleStudents((e.target as HTMLDetailsElement).open)}>
                <summary className="cursor-pointer text-xl font-semibold text-slate-900">
                  Braki wedlug uczniow
                </summary>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <input
                    className={fieldClass}
                    placeholder="Szukaj (uczen, klasa, przedmiot)"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                  />
                </div>
                {!studentsLoaded && (
                  <div className="mt-4 text-sm text-slate-600">
                    Dane uczniów są ładowane na żądanie. Rozwiń sekcję aby pobrać.
                  </div>
                )}
                {studentsLoaded && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <div>
                      Pokazujesz {report.missingByStudent.length} z {report.missingStudentsTotal}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        disabled={studentsPage <= 1}
                        onClick={() => handleStudentsPageChange(studentsPage - 1)}
                      >
                        Poprzednia
                      </button>
                      <span>
                        Strona {studentsPage} /{" "}
                        {Math.max(1, Math.ceil(report.missingStudentsTotal / studentsPageSize))}
                      </span>
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        disabled={
                          studentsPage >=
                          Math.ceil(report.missingStudentsTotal / studentsPageSize)
                        }
                        onClick={() => handleStudentsPageChange(studentsPage + 1)}
                      >
                        Następna
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-700">
                      <th className="py-2">Uczen</th>
                      <th>Klasa</th>
                      <th>Braki</th>
                      <th>Przedmioty</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-900">
                    {filteredMissingStudents.map((row) => (
                      <tr key={row.studentId} className="border-t">
                        <td className="py-2">{row.studentName}</td>
                        <td>{row.className}</td>
                        <td className={row.missingCount ? "text-red-600" : "text-slate-700"}>
                          {row.missingCount}
                        </td>
                        <td title={row.subjects.join(", ")}>{formatSubjects(row.subjects)}</td>
                        <td className="text-right">
                          <Link
                            href="/admin/students"
                            className="text-xs text-blue-700 hover:underline"
                          >
                            Przejdz do ucznia
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {filteredMissingStudents.length === 0 && (
                      <tr>
                        <td className="py-3 text-gray-500" colSpan={5}>
                          Brak danych
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </details>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
              <button
                type="button"
                onClick={handleToggleDetails}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xl font-semibold text-slate-900">Szczegoly brakow</span>
                <span className="text-sm text-slate-500">
                  {detailsOpen ? "Ukryj" : detailsLoaded ? "Pokaz" : "Zaladuj szczegoly"}
                </span>
              </button>
              {detailsOpen && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-700">
                        <th className="py-2">Uczen</th>
                        <th>Klasa</th>
                        <th>Przedmiot</th>
                        <th>Nauczyciel</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-900">
                      {report.missingDetails.map((row) => (
                        <tr key={`${row.studentId}-${row.subjectId}`} className="border-t">
                          <td className="py-2">{row.studentName}</td>
                          <td>{row.className}</td>
                          <td>{row.subjectName}</td>
                          <td>{row.teacherName}</td>
                          <td className="text-right">
                            <Link
                              href="/admin/assignments"
                              className="text-xs text-blue-700 hover:underline"
                            >
                              Przejdz do przypisan
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {report.missingDetails.length === 0 && (
                        <tr>
                          <td className="py-3 text-gray-500" colSpan={5}>
                            Brak danych
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
