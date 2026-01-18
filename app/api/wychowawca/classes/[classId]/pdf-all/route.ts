import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessClassAsHomeroom } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import JSZip from "jszip"
import { renderPdfFromHtml } from "@/lib/pdf/playwright"
import { buildStudentPdfHtml } from "@/lib/pdf/montessori"

const toSafeFilename = (value: string) =>
  value
    .trim()
    .replace(/[\\/?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")

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
        teacher: true,
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
          term: true,
        },
      }),
    ])

    const classInfo = {
      name: class_.name,
      schoolYearName: class_.schoolYear.name,
      homeroomName: `${class_.teacher?.firstName || ""} ${class_.teacher?.lastName || ""}`.trim(),
    }
    const zip = new JSZip()

    for (const student of class_.students) {
      const studentGrades = grades.filter((grade) => grade.studentId === student.id)
      const html = buildStudentPdfHtml({
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
        },
        classInfo,
        subjects,
        gradeScales,
        grades: studentGrades,
      })
      const pdfBuffer = await renderPdfFromHtml(html)
      const filename = toSafeFilename(
        `oceny_${student.firstName}_${student.lastName}_${class_.name}.pdf`
      )
      zip.file(filename, pdfBuffer)
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })
    const zipArrayBuffer = zipBuffer.buffer.slice(
      zipBuffer.byteOffset,
      zipBuffer.byteOffset + zipBuffer.byteLength
    ) as ArrayBuffer
    const zipBlob = new Blob([zipArrayBuffer], { type: "application/zip" })
    const zipFilename = toSafeFilename(`oceny_${class_.name}.zip`)

    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
