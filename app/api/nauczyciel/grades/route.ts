import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessSubjectClass, isStudentInClass } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"
import { z } from "zod"

const gradeSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  schoolYearId: z.string().uuid(),
  term: z.enum(["MIDYEAR", "FINAL"]),
  gradeScaleId: z.string().uuid().nullable(),
})

export async function POST(request: Request) {
  try {
    const user = await requireRole("TEACHER")
    const body = await request.json()
    const data = gradeSchema.parse(body)

    const activeYear = await prisma.schoolYear.findFirst({
      where: { isActive: true },
      select: { id: true, gradingTerm: true, isGradingOpen: true },
    })
    if (!activeYear) {
      return NextResponse.json({ error: "No active school year found" }, { status: 400 })
    }
    if (activeYear.id !== data.schoolYearId) {
      return NextResponse.json({ error: "School year is not active" }, { status: 403 })
    }
    if (!activeYear.isGradingOpen) {
      return NextResponse.json({ error: "Grading is locked" }, { status: 403 })
    }
    if (activeYear.gradingTerm !== data.term) {
      return NextResponse.json({ error: "Grading term is closed" }, { status: 403 })
    }

    // Pobierz klasę ucznia
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { class: true },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Sprawdź uprawnienia
    const hasAccess = await canTeacherAccessSubjectClass(
      user.id,
      data.subjectId,
      student.classId
    )

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Sprawdź czy uczeń jest w klasie
    const studentInClass = await isStudentInClass(data.studentId, student.classId)
    if (!studentInClass) {
      return NextResponse.json({ error: "Student not in class" }, { status: 400 })
    }

    if (data.gradeScaleId) {
      const gradeScale = await prisma.montessoriGradeScale.findUnique({
        where: { id: data.gradeScaleId },
        select: { isActive: true, appliesToMidyear: true, appliesToFinal: true },
      })
      if (!gradeScale || !gradeScale.isActive) {
        return NextResponse.json({ error: "Grade scale is inactive" }, { status: 400 })
      }
      const isAllowed =
        data.term === "FINAL" ? gradeScale.appliesToFinal : gradeScale.appliesToMidyear
      if (!isAllowed) {
        return NextResponse.json({ error: "Grade scale not allowed for this term" }, { status: 400 })
      }
    }

    // Zapisz lub zaktualizuj ocenę
    const grade = await prisma.studentGrade.upsert({
      where: {
        studentId_subjectId_schoolYearId_term: {
          studentId: data.studentId,
          subjectId: data.subjectId,
          schoolYearId: data.schoolYearId,
          term: data.term,
        },
      },
      update: {
        gradeScaleId: data.gradeScaleId,
        teacherId: user.id,
        term: data.term,
      },
      create: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        schoolYearId: data.schoolYearId,
        term: data.term,
        gradeScaleId: data.gradeScaleId,
        teacherId: user.id,
      },
    })

    await logAuditEvent({
      action: "teacher.grade.upsert",
      entityType: "studentGrade",
      entityId: grade.id,
      entityLabel: `${grade.studentId}:${grade.subjectId}:${grade.term}`,
      actorId: user.id,
      actorEmail: user.email,
      actorRoles: user.roles,
      metadata: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        schoolYearId: data.schoolYearId,
        term: data.term,
        gradeScaleId: data.gradeScaleId,
      },
      ...getRequestMeta(request),
    })
    return NextResponse.json(grade)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}

// Pobierz oceny dla klasy i przedmiotu
export async function GET(request: Request) {
  try {
    const user = await requireRole("TEACHER")
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")
    const subjectId = searchParams.get("subjectId")
    const schoolYearId = searchParams.get("schoolYearId")
    const term = searchParams.get("term")

    if (!classId || !subjectId || !schoolYearId || !term) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    // Sprawdź uprawnienia
    const hasAccess = await canTeacherAccessSubjectClass(user.id, subjectId, classId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const grades = await prisma.studentGrade.findMany({
      where: {
        subjectId,
        schoolYearId,
        term: term === "FINAL" ? "FINAL" : "MIDYEAR",
        student: {
          classId,
        },
        teacherId: user.id,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        gradeScale: true,
      },
    })

    return NextResponse.json(grades)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
