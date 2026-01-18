"use client"

import { Fragment, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface Student {
  id: string
  firstName: string
  lastName: string
}

interface Subject {
  id: string
  name: string
}

interface GradeScale {
  id: string
  label: string
  colorHex: string
  sortOrder: number
}

interface Grade {
  id: string
  studentId: string
  subjectId: string
  gradeScaleId: string | null
  gradeScale: GradeScale | null
  term: "MIDYEAR" | "FINAL"
}

export default function WychowawcaClassPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const classId = params.classId as string

  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [schoolYearId, setSchoolYearId] = useState<string>("")
  const [termMode, setTermMode] = useState<"MIDYEAR" | "FINAL" | "BOTH">("BOTH")
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user.role !== "HOMEROOM") {
      router.push("/unauthorized")
      return
    }

    if (status === "authenticated") {
      fetchActiveYear()
    }
  }, [status, session, router, classId])

  const fetchActiveYear = async () => {
    try {
      const res = await fetch("/api/school-year/active")
      if (res.ok) {
        const year = await res.json()
        setSchoolYearId(year.id)
        fetchData(year.id)
      }
    } catch (error) {
      console.error("Error fetching active year:", error)
      setLoading(false)
    }
  }

  const fetchData = async (yearId: string) => {
    try {
      const res = await fetch(
        `/api/wychowawca/classes/${classId}/grades?schoolYearId=${yearId}`
      )
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students)
        setSubjects(data.subjects)
        setGradeScales(data.gradeScales)
        setGrades(data.grades)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeForStudentSubject = (
    studentId: string,
    subjectId: string,
    term: "MIDYEAR" | "FINAL"
  ) => {
    return grades.find(
      (g) => g.studentId === studentId && g.subjectId === subjectId && g.term === term
    )
  }

  const handleGeneratePdf = async (studentId?: string) => {
    if (!schoolYearId) return

    setGeneratingPdf(studentId || "all")

    const termQuery = termMode === "BOTH" ? "" : `&term=${termMode}`
    const getFilename = (res: Response, fallback: string) => {
      const header = res.headers.get("content-disposition") || ""
      const match = header.match(/filename="([^"]+)"/)
      return match?.[1] || fallback
    }

    try {
      if (studentId) {
        // Pojedynczy uczeń
        const res = await fetch(
          `/api/wychowawca/classes/${classId}/students/${studentId}/pdf?schoolYearId=${schoolYearId}${termQuery}`
        )
        if (res.ok) {
          const blob = await res.blob()
          const filename = getFilename(res, `oceny_${studentId}.pdf`)
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } else {
        // Cała klasa (wielostronicowy PDF)
        const res = await fetch(
          `/api/wychowawca/classes/${classId}/pdf-all?schoolYearId=${schoolYearId}${termQuery}`
        )
        if (res.ok) {
          const blob = await res.blob()
          const filename = getFilename(res, "oceny_klasa.zip")
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Błąd podczas generowania PDF")
    } finally {
      setGeneratingPdf(null)
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
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/wychowawca"
              className="text-blue-600 hover:text-blue-800"
            >
              ← Powrót do listy klas
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              Oceny klasy
            </h1>
          </div>
          <div className="flex gap-2">
            <select
              value={termMode}
              onChange={(e) => setTermMode(e.target.value as "MIDYEAR" | "FINAL" | "BOTH")}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="MIDYEAR">Semestr</option>
              <option value="FINAL">Koniec roku</option>
              <option value="BOTH">Razem</option>
            </select>
            <button
              onClick={() => handleGeneratePdf()}
              disabled={generatingPdf === "all"}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingPdf === "all" ? "Generowanie..." : "Generuj PDF (cała klasa)"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Uczeń
                </th>
                {subjects.map((subject) => (
                  <th
                    key={subject.id}
                    colSpan={2}
                    className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {subject.name}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  PDF
                </th>
              </tr>
              <tr>
                {subjects.map((subject) => (
                  <Fragment key={subject.id}>
                    <th className="px-4 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-gray-400">
                      Semestr
                    </th>
                    <th className="px-4 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-gray-400">
                      Koniec roku
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {students.map((student) => {
                return (
                  <tr key={student.id}>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-6 py-4 text-sm font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </td>
                    {subjects.map((subject) => {
                      const midyear = getGradeForStudentSubject(
                        student.id,
                        subject.id,
                        "MIDYEAR"
                      )
                      const final = getGradeForStudentSubject(
                        student.id,
                        subject.id,
                        "FINAL"
                      )
                      return (
                        <Fragment key={subject.id}>
                          <td
                            className="px-6 py-4 text-center"
                            style={{
                              backgroundColor: midyear?.gradeScale?.colorHex
                                ? `${midyear.gradeScale.colorHex}20`
                                : "transparent",
                            }}
                          >
                            {midyear?.gradeScale ? (
                              <span
                                className="inline-block h-6 w-6 rounded-full"
                                style={{
                                  backgroundColor: midyear.gradeScale.colorHex,
                                }}
                                title={midyear.gradeScale.label}
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td
                            className="px-6 py-4 text-center"
                            style={{
                              backgroundColor: final?.gradeScale?.colorHex
                                ? `${final.gradeScale.colorHex}20`
                                : "transparent",
                            }}
                          >
                            {final?.gradeScale ? (
                              <span
                                className="inline-block h-6 w-6 rounded-full"
                                style={{
                                  backgroundColor: final.gradeScale.colorHex,
                                }}
                                title={final.gradeScale.label}
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </Fragment>
                      )
                    })}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleGeneratePdf(student.id)}
                        disabled={generatingPdf === student.id}
                        className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {generatingPdf === student.id ? "..." : "PDF"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
