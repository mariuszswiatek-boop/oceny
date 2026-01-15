import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessSubjectClass, isStudentInClass } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const gradeSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  schoolYearId: z.string().uuid(),
  gradeScaleId: z.string().uuid().nullable(),
})

export async function POST(request: Request) {
  try {
    const user = await requireRole("NAUCZYCIEL")
    const body = await request.json()
    const data = gradeSchema.parse(body)

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

    // Zapisz lub zaktualizuj ocenę
    const grade = await prisma.studentGrade.upsert({
      where: {
        studentId_subjectId_schoolYearId: {
          studentId: data.studentId,
          subjectId: data.subjectId,
          schoolYearId: data.schoolYearId,
        },
      },
      update: {
        gradeScaleId: data.gradeScaleId,
        teacherId: user.id,
      },
      create: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        schoolYearId: data.schoolYearId,
        gradeScaleId: data.gradeScaleId,
        teacherId: user.id,
      },
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
    const user = await requireRole("NAUCZYCIEL")
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")
    const subjectId = searchParams.get("subjectId")
    const schoolYearId = searchParams.get("schoolYearId")

    if (!classId || !subjectId || !schoolYearId) {
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
