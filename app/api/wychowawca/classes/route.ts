import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const user = await requireRole("HOMEROOM")
    const classes = await prisma.class.findMany({
      where: {
        teacherId: user.id,
      },
      include: {
        schoolYear: {
          select: {
            id: true,
            name: true,
            gradingTerm: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        classId: { in: classes.map((class_) => class_.id) },
        schoolYearId: { in: classes.map((class_) => class_.schoolYear.id) },
        isActive: true,
      },
      select: {
        classId: true,
        subjectId: true,
      },
    })
    const subjectIdsByClass = new Map<string, Set<string>>()
    for (const assignment of assignments) {
      const set = subjectIdsByClass.get(assignment.classId) ?? new Set<string>()
      set.add(assignment.subjectId)
      subjectIdsByClass.set(assignment.classId, set)
    }

    const summaries = await Promise.all(
      classes.map(async (class_) => {
        const totalStudents = await prisma.student.count({
          where: { classId: class_.id, isActive: true },
        })
        const subjectIds = Array.from(subjectIdsByClass.get(class_.id) ?? [])
        const total = totalStudents * subjectIds.length
        if (!subjectIds.length || totalStudents === 0) {
          return {
            classId: class_.id,
            missingGrades: 0,
            studentsMissing: 0,
          }
        }

        const filled = await prisma.studentGrade.count({
          where: {
            schoolYearId: class_.schoolYear.id,
            term: class_.schoolYear.gradingTerm,
            subjectId: { in: subjectIds },
            gradeScaleId: { not: null },
            student: { classId: class_.id, isActive: true },
          },
        })

        const studentCounts = await prisma.studentGrade.groupBy({
          by: ["studentId"],
          where: {
            schoolYearId: class_.schoolYear.id,
            term: class_.schoolYear.gradingTerm,
            subjectId: { in: subjectIds },
            gradeScaleId: { not: null },
            student: { classId: class_.id, isActive: true },
          },
          _count: { _all: true },
        })

        const completeStudents = studentCounts.filter(
          (item) => item._count._all >= subjectIds.length
        ).length

        return {
          classId: class_.id,
          missingGrades: Math.max(0, total - filled),
          studentsMissing: Math.max(0, totalStudents - completeStudents),
        }
      })
    )

    const summaryByClass = new Map(summaries.map((s) => [s.classId, s]))

    const enriched = classes.map((class_) => ({
      ...class_,
      summary: summaryByClass.get(class_.id) ?? { missingGrades: 0, studentsMissing: 0 },
    }))

    return NextResponse.json(enriched)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
