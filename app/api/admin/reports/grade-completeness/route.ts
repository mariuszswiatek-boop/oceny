import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

type Term = "MIDYEAR" | "FINAL"

const termFromParam = (value: string | null, fallback: Term): Term => {
  if (value === "FINAL" || value === "MIDYEAR") return value
  return fallback
}

const percent = (completed: number, expected: number) =>
  expected === 0 ? 100 : Math.round((completed / expected) * 1000) / 10

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN")
    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get("includeDetails") === "true"
    const includeStudents = searchParams.get("includeStudents") === "true"
    const studentsPage = Math.max(1, Number(searchParams.get("studentsPage") || 1))
    const studentsPageSize = Math.min(200, Math.max(10, Number(searchParams.get("studentsPageSize") || 50)))
    const schoolYearId = searchParams.get("schoolYearId") || undefined

    const selectedYear = schoolYearId
      ? await prisma.schoolYear.findUnique({ where: { id: schoolYearId } })
      : await prisma.schoolYear.findFirst({
          where: { isActive: true },
          orderBy: { sortOrder: "desc" },
        })

    if (!selectedYear) {
      return NextResponse.json({ error: "School year not found" }, { status: 404 })
    }

    const term = termFromParam(searchParams.get("term"), selectedYear.gradingTerm)

    const classes = await prisma.class.findMany({
      where: { schoolYearId: selectedYear.id, isActive: true },
      select: { id: true, name: true, schoolYearId: true },
    })
    const classIds = classes.map((item) => item.id)
    const classMap = new Map(classes.map((item) => [item.id, item]))

    if (classIds.length === 0) {
      return NextResponse.json({
        schoolYear: { id: selectedYear.id, name: selectedYear.name },
        term,
        summary: { expected: 0, completed: 0, missing: 0, completion: 100 },
        byClass: [],
        bySubject: [],
        byTeacher: [],
        byClassSubject: [],
        missingByStudent: [],
        missingDetails: [],
      })
    }

    const students = await prisma.student.findMany({
      where: { classId: { in: classIds }, isActive: true },
      select: { id: true, firstName: true, lastName: true, classId: true },
    })
    const studentsByClass = new Map<string, typeof students>()
    const studentClass = new Map(students.map((student) => [student.id, student.classId]))
    for (const student of students) {
      const bucket = studentsByClass.get(student.classId)
      if (bucket) {
        bucket.push(student)
      } else {
        studentsByClass.set(student.classId, [student])
      }
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        schoolYearId: selectedYear.id,
        isActive: true,
        classId: { in: classIds },
        subject: { isActive: true },
      },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
    })

    const studentIds = students.map((student) => student.id)
    const subjectIds = Array.from(new Set(assignments.map((item) => item.subjectId)))
    const grades =
      studentIds.length && subjectIds.length
        ? await prisma.studentGrade.findMany({
            where: {
              schoolYearId: selectedYear.id,
              term,
              gradeScaleId: { not: null },
              studentId: { in: studentIds },
              subjectId: { in: subjectIds },
            },
            select: { studentId: true, subjectId: true },
          })
        : []

    const gradeKeySet = new Set(grades.map((grade) => `${grade.studentId}|${grade.subjectId}`))
    const gradeCountByClassSubject = new Map<string, number>()
    for (const grade of grades) {
      const classId = studentClass.get(grade.studentId)
      if (!classId) continue
      const key = `${classId}|${grade.subjectId}`
      gradeCountByClassSubject.set(key, (gradeCountByClassSubject.get(key) ?? 0) + 1)
    }

    const byClass = new Map<
      string,
      { classId: string; className: string; expected: number; completed: number; missing: number }
    >()
    const bySubject = new Map<
      string,
      { subjectId: string; subjectName: string; expected: number; completed: number; missing: number }
    >()
    const byTeacher = new Map<
      string,
      { teacherId: string; teacherName: string; expected: number; completed: number; missing: number }
    >()

    const byClassSubject: Array<{
      classId: string
      className: string
      subjectId: string
      subjectName: string
      teacherId: string
      teacherName: string
      expected: number
      completed: number
      missing: number
    }> = []

    const missingByStudentMap = new Map<
      string,
      { studentId: string; studentName: string; classId: string; className: string; missingCount: number; subjects: string[] }
    >()

    const missingDetails: Array<{
      studentId: string
      studentName: string
      classId: string
      className: string
      subjectId: string
      subjectName: string
      teacherId: string
      teacherName: string
    }> = []

    let summaryExpected = 0
    let summaryCompleted = 0

    for (const assignment of assignments) {
      const classStudents = studentsByClass.get(assignment.classId) ?? []
      const expected = classStudents.length
      const key = `${assignment.classId}|${assignment.subjectId}`
      const completed = gradeCountByClassSubject.get(key) ?? 0
      const missing = Math.max(0, expected - completed)

      summaryExpected += expected
      summaryCompleted += completed

      const classEntry = byClass.get(assignment.classId) ?? {
        classId: assignment.classId,
        className: assignment.class.name,
        expected: 0,
        completed: 0,
        missing: 0,
      }
      classEntry.expected += expected
      classEntry.completed += completed
      classEntry.missing += missing
      byClass.set(assignment.classId, classEntry)

      const subjectEntry = bySubject.get(assignment.subjectId) ?? {
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
        expected: 0,
        completed: 0,
        missing: 0,
      }
      subjectEntry.expected += expected
      subjectEntry.completed += completed
      subjectEntry.missing += missing
      bySubject.set(assignment.subjectId, subjectEntry)

      const teacherEntry = byTeacher.get(assignment.teacherId) ?? {
        teacherId: assignment.teacherId,
        teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
        expected: 0,
        completed: 0,
        missing: 0,
      }
      teacherEntry.expected += expected
      teacherEntry.completed += completed
      teacherEntry.missing += missing
      byTeacher.set(assignment.teacherId, teacherEntry)

      byClassSubject.push({
        classId: assignment.classId,
        className: assignment.class.name,
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
        teacherId: assignment.teacherId,
        teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
        expected,
        completed,
        missing,
      })

      for (const student of classStudents) {
        if (gradeKeySet.has(`${student.id}|${assignment.subjectId}`)) {
          continue
        }
        if (includeStudents) {
          const studentEntry = missingByStudentMap.get(student.id) ?? {
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            classId: student.classId,
            className: classMap.get(student.classId)?.name ?? "-",
            missingCount: 0,
            subjects: [],
          }
          studentEntry.missingCount += 1
          studentEntry.subjects.push(assignment.subject.name)
          missingByStudentMap.set(student.id, studentEntry)
        }
        if (includeDetails) {
          missingDetails.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            classId: student.classId,
            className: classMap.get(student.classId)?.name ?? "-",
            subjectId: assignment.subjectId,
            subjectName: assignment.subject.name,
            teacherId: assignment.teacherId,
            teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
          })
        }
      }
    }

    const summaryMissing = Math.max(0, summaryExpected - summaryCompleted)
    const missingByStudentAll = includeStudents
      ? Array.from(missingByStudentMap.values())
          .map((entry) => ({
            ...entry,
            subjects: entry.subjects.sort((a, b) => a.localeCompare(b)),
          }))
          .sort((a, b) => {
            if (b.missingCount !== a.missingCount) return b.missingCount - a.missingCount
            return a.studentName.localeCompare(b.studentName)
          })
      : []
    const missingStudentsTotal = includeStudents ? missingByStudentAll.length : 0
    const missingByStudent =
      includeStudents && missingByStudentAll.length
        ? missingByStudentAll.slice(
            (studentsPage - 1) * studentsPageSize,
            studentsPage * studentsPageSize
          )
        : []

    return NextResponse.json({
      schoolYear: { id: selectedYear.id, name: selectedYear.name },
      term,
      summary: {
        expected: summaryExpected,
        completed: summaryCompleted,
        missing: summaryMissing,
        completion: percent(summaryCompleted, summaryExpected),
      },
      byClass: Array.from(byClass.values()).map((entry) => ({
        ...entry,
        completion: percent(entry.completed, entry.expected),
      })),
      bySubject: Array.from(bySubject.values()).map((entry) => ({
        ...entry,
        completion: percent(entry.completed, entry.expected),
      })),
      byTeacher: Array.from(byTeacher.values()).map((entry) => ({
        ...entry,
        completion: percent(entry.completed, entry.expected),
      })),
      byClassSubject: byClassSubject.map((entry) => ({
        ...entry,
        completion: percent(entry.completed, entry.expected),
      })),
      missingByStudent,
      missingStudentsTotal,
      missingStudentsPage: includeStudents ? studentsPage : 1,
      missingStudentsPageSize: includeStudents ? studentsPageSize : studentsPageSize,
      missingDetails,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
