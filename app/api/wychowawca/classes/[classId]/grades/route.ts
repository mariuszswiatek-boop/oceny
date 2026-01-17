import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessClassAsHomeroom } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const user = await requireRole("HOMEROOM")
    const { classId } = await params
    const { searchParams } = new URL(request.url)
    const schoolYearId = searchParams.get("schoolYearId")

    if (!schoolYearId) {
      return NextResponse.json({ error: "Missing schoolYearId" }, { status: 400 })
    }

    // Sprawdź uprawnienia
    const hasAccess = await canTeacherAccessClassAsHomeroom(user.id, classId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Pobierz wszystkich uczniów w klasie
    const students = await prisma.student.findMany({
      where: {
        classId,
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    })

    // Pobierz wszystkie przedmioty
    const subjects = await prisma.subject.findMany({
      orderBy: {
        name: "asc",
      },
    })

    // Pobierz wszystkie oceny dla uczniów w klasie
    const grades = await prisma.studentGrade.findMany({
      where: {
        studentId: {
          in: students.map((s) => s.id),
        },
        schoolYearId,
      },
      include: {
        gradeScale: true,
        subject: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Pobierz skalę ocen
    const gradeScales = await prisma.montessoriGradeScale.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    })

    return NextResponse.json({
      students,
      subjects,
      grades,
      gradeScales,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
