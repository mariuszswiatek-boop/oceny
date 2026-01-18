import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const user = await requireRole("TEACHER")
    const activeYear = await prisma.schoolYear.findFirst({
      where: { isActive: true },
      select: { id: true, gradingTerm: true },
    })

    const classes = await prisma.class.findMany({
      where: {
        teacherAssignments: {
          some: {
            teacherId: user.id,
          },
        },
      },
      include: {
        schoolYear: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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

    if (!activeYear) {
      const noYearClasses = classes.map((class_) => ({
        ...class_,
        gradeSummary: { total: 0, filled: 0, unfilled: 0 },
      }))
      return NextResponse.json(noYearClasses)
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId: user.id,
        schoolYearId: activeYear.id,
        classId: { in: classes.map((c) => c.id) },
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
        const subjectIds = Array.from(subjectIdsByClass.get(class_.id) ?? [])
        const total = class_._count.students * subjectIds.length
        const filled =
          subjectIds.length === 0
            ? 0
            : await prisma.studentGrade.count({
                where: {
                  teacherId: user.id,
                  schoolYearId: activeYear.id,
                  term: activeYear.gradingTerm,
                  subjectId: { in: subjectIds },
                  student: { classId: class_.id },
                },
              })
        return { classId: class_.id, total, filled, unfilled: Math.max(0, total - filled) }
      })
    )

    const summaryByClass = new Map(summaries.map((s) => [s.classId, s]))
    const enriched = classes.map((class_) => ({
      ...class_,
      gradeSummary: summaryByClass.get(class_.id) ?? { total: 0, filled: 0, unfilled: 0 },
    }))

    return NextResponse.json(enriched)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
