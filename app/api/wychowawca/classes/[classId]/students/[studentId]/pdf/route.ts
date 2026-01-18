import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessClassAsHomeroom, isStudentInClass } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { renderPdfFromHtml } from "@/lib/pdf/playwright"

const toSafeFilename = (value: string) =>
  value
    .trim()
    .replace(/[\\/?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")
import { buildStudentPdfHtml } from "@/lib/pdf/montessori"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; studentId: string }> }
) {
  try {
    const user = await requireRole("HOMEROOM")
    const { classId, studentId } = await params
    const { searchParams } = new URL(request.url)
    const schoolYearId = searchParams.get("schoolYearId")

    if (!schoolYearId) {
      return NextResponse.json({ error: "Missing schoolYearId" }, { status: 400 })
    }

    const hasAccess = await canTeacherAccessClassAsHomeroom(user.id, classId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const studentInClass = await isStudentInClass(studentId, classId)
    if (!studentInClass) {
      return NextResponse.json({ error: "Student not in class" }, { status: 403 })
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            teacher: true,
            schoolYear: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const [subjects, gradeScales, grades] = await Promise.all([
      prisma.subject.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.montessoriGradeScale.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.studentGrade.findMany({
        where: {
          studentId,
          schoolYearId,
        },
        select: {
          studentId: true,
          subjectId: true,
          gradeScaleId: true,
          term: true,
        },
      }),
    ])

    const html = buildStudentPdfHtml({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      classInfo: {
        name: student.class.name,
        schoolYearName: student.class.schoolYear.name,
        homeroomName: `${student.class.teacher?.firstName || ""} ${
          student.class.teacher?.lastName || ""
        }`.trim(),
      },
      subjects,
      gradeScales,
      grades,
    })

    const pdfBuffer = await renderPdfFromHtml(html)
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer
    const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" })

    const filename = toSafeFilename(
      `oceny_${student.firstName}_${student.lastName}_${student.class.name}.pdf`
    )

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
