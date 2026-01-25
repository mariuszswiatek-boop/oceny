import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessClassAsHomeroom } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import JSZip from "jszip"
import { renderPdfFromHtml } from "@/lib/pdf/playwright"
import { buildStudentPdfHtml } from "@/lib/pdf/montessori"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const toSafeFilename = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

const formatTimestamp = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours()
  )}-${pad(date.getMinutes())}`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const user = await requireRole("HOMEROOM")
    const { classId } = await params
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
          studentId: { in: class_.students.map((student) => student.id) },
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
        termMode,
      })
      const pdfBuffer = await renderPdfFromHtml(html)
      const termLabel =
        termMode === "MIDYEAR" ? "semestr" : termMode === "FINAL" ? "koniec_roku" : "razem"
      const filename = toSafeFilename(
        `oceny_${student.firstName}_${student.lastName}_${class_.name}_${termLabel}_${formatTimestamp(
          new Date()
        )}.pdf`
      )
      zip.file(filename, pdfBuffer)
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })
    const zipArrayBuffer = zipBuffer.buffer.slice(
      zipBuffer.byteOffset,
      zipBuffer.byteOffset + zipBuffer.byteLength
    ) as ArrayBuffer
    const zipBlob = new Blob([zipArrayBuffer], { type: "application/zip" })
    const termLabel =
      termMode === "MIDYEAR" ? "semestr" : termMode === "FINAL" ? "koniec_roku" : "razem"
    const zipFilename = toSafeFilename(
      `oceny_${class_.name}_${termLabel}_${formatTimestamp(new Date())}.zip`
    )

    await logAuditEvent({
      action: "homeroom.pdf.class",
      entityType: "classPdf",
      entityId: class_.id,
      entityLabel: class_.name,
      actorId: user.id,
      actorEmail: user.email,
      actorRoles: user.roles,
      metadata: { schoolYearId, termMode, studentCount: class_.students.length },
      ...getRequestMeta(request),
    })
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
