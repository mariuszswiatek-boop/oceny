import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessClassAsHomeroom, isStudentInClass } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { renderPdfFromHtml } from "@/lib/pdf/playwright"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const toSafeFilename = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
import { buildStudentPdfHtml } from "@/lib/pdf/montessori"

const formatTimestamp = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours()
  )}-${pad(date.getMinutes())}`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; studentId: string }> }
) {
  try {
    const user = await requireRole("HOMEROOM")
    const { classId, studentId } = await params
    const { searchParams } = new URL(request.url)
    const schoolYearId = searchParams.get("schoolYearId")
    const termParam = searchParams.get("term")
    const termMode =
      termParam === "MIDYEAR" ? "MIDYEAR" : termParam === "FINAL" ? "FINAL" : "BOTH"

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

    const [assignments, gradeScales] = await Promise.all([
      prisma.teacherAssignment.findMany({
        where: {
          classId,
          schoolYearId,
          isActive: true,
        },
        select: { subjectId: true },
        distinct: ["subjectId"],
      }),
      prisma.montessoriGradeScale.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
    ])
    const subjectIds = assignments.map((assignment) => assignment.subjectId)
    const [subjects, grades] = await Promise.all([
      prisma.subject.findMany({
        where: {
          id: { in: subjectIds },
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.studentGrade.findMany({
        where: {
          studentId,
          schoolYearId,
          subjectId: { in: subjectIds },
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
      termMode,
    })

    const pdfBuffer = await renderPdfFromHtml(html)
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer
    const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" })

    const termLabel =
      termMode === "MIDYEAR" ? "semestr" : termMode === "FINAL" ? "koniec_roku" : "razem"
    const filename = toSafeFilename(
      `oceny_${student.firstName}_${student.lastName}_${student.class.name}_${termLabel}_${formatTimestamp(
        new Date()
      )}.pdf`
    )

    await logAuditEvent({
      action: "homeroom.pdf.student",
      entityType: "studentPdf",
      entityId: student.id,
      entityLabel: `${student.firstName} ${student.lastName}`,
      actorId: user.id,
      actorEmail: user.email,
      actorRoles: user.roles,
      metadata: { classId, schoolYearId, termMode },
      ...getRequestMeta(request),
    })
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
