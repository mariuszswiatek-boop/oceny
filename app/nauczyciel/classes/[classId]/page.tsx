"use client"

import { useEffect, useState } from "react"
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
}

export default function ClassPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const classId = params.classId as string

  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [schoolYearId, setSchoolYearId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user.role !== "TEACHER") {
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
      const [studentsRes, subjectsRes, gradeScalesRes] = await Promise.all([
        fetch(`/api/nauczyciel/classes/${classId}/students`),
        fetch("/api/nauczyciel/subjects"),
        fetch("/api/nauczyciel/grade-scales"),
      ])

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        setStudents(studentsData)
      }

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json()
        setSubjects(subjectsData)
        if (subjectsData.length > 0 && !selectedSubject) {
          setSelectedSubject(subjectsData[0].id)
        }
      }

      if (gradeScalesRes.ok) {
        const gradeScalesData = await gradeScalesRes.json()
        setGradeScales(gradeScalesData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSubject && schoolYearId) {
      fetchGrades()
    }
  }, [selectedSubject, classId, schoolYearId])

  const fetchGrades = async () => {
    if (!selectedSubject || !schoolYearId) return

    try {
      const res = await fetch(
        `/api/nauczyciel/grades?classId=${classId}&subjectId=${selectedSubject}&schoolYearId=${schoolYearId}`
      )
      if (res.ok) {
        const data = await res.json()
        setGrades(data)
      }
    } catch (error) {
      console.error("Error fetching grades:", error)
    }
  }

  const handleGradeChange = async (
    studentId: string,
    gradeScaleId: string | null
  ) => {
    if (!selectedSubject || !schoolYearId) return

    setSaving(studentId)

    try {
      const res = await fetch("/api/nauczyciel/grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          subjectId: selectedSubject,
          schoolYearId,
          gradeScaleId,
        }),
      })

      if (res.ok) {
        const newGrade = await res.json()
        setGrades((prev) => {
          const filtered = prev.filter(
            (g) => !(g.studentId === studentId && g.subjectId === selectedSubject)
          )
          return [...filtered, newGrade]
        })
        setToast("Ocena zapisana")
        setTimeout(() => setToast(null), 2000)
      }
    } catch (error) {
      console.error("Error saving grade:", error)
      setToast("Błąd podczas zapisywania")
      setTimeout(() => setToast(null), 2000)
    } finally {
      setSaving(null)
    }
  }

  const getGradeForStudent = (studentId: string) => {
    return grades.find(
      (g) => g.studentId === studentId && g.subjectId === selectedSubject
    )?.gradeScaleId
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Ładowanie...</div>
      </div>
    )
  }

  const selectedSubjectName = subjects.find((s) => s.id === selectedSubject)?.name || ""

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/nauczyciel"
              className="text-blue-600 hover:text-blue-800"
            >
              ← Powrót do listy klas
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              Wprowadzanie ocen
            </h1>
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">
              Wybierz przedmiot:
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedSubject && (
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedSubjectName}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Uczeń
                    </th>
                    {gradeScales.map((scale) => (
                      <th
                        key={scale.id}
                        className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
                        style={{ color: scale.colorHex }}
                      >
                        {scale.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {students.map((student) => {
                    const currentGrade = getGradeForStudent(student.id)
                    return (
                      <tr key={student.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </td>
                        {gradeScales.map((scale) => (
                          <td key={scale.id} className="px-6 py-4 text-center">
                            <input
                              type="radio"
                              name={`grade-${student.id}`}
                              checked={currentGrade === scale.id}
                              onChange={() =>
                                handleGradeChange(
                                  student.id,
                                  currentGrade === scale.id ? null : scale.id
                                )
                              }
                              disabled={saving === student.id}
                              className="h-5 w-5"
                              style={{ accentColor: scale.colorHex }}
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-4 right-4 rounded-md bg-green-500 px-4 py-2 text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
