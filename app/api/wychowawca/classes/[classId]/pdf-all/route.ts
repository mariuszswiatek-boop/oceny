import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessClassAsHomeroom } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { renderPdfFromHtml } from "@/lib/pdf/playwright"
import { buildClassPdfHtml } from "@/lib/pdf/montessori"

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

    const hasAccess = await canTeacherAccessClassAsHomeroom(user.id, classId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const class_ = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        schoolYear: true,
        homeroomTeacher: true,
        students: {
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        },
      },
    })

    if (!class_) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
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
          studentId: { in: class_.students.map((student) => student.id) },
          schoolYearId,
        },
        select: {
          studentId: true,
          subjectId: true,
          gradeScaleId: true,
        },
      }),
    ])

    const html = buildClassPdfHtml({
      students: class_.students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
      })),
      classInfo: {
        name: class_.name,
        schoolYearName: class_.schoolYear.name,
        homeroomName: `${class_.homeroomTeacher?.firstName || ""} ${
          class_.homeroomTeacher?.lastName || ""
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

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="oceny_${class_.name}_${class_.schoolYear.name}.pdf"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
