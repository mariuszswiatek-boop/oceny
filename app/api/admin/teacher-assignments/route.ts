import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const uuidField = z.string().uuid()
const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value
const optionalUuid = z.preprocess(emptyToUndefined, uuidField.optional())
const optionalId = z.preprocess(emptyToUndefined, z.string().min(1).optional())

const assignmentSchema = z.object({
  teacherId: optionalUuid,
  classId: optionalId,
  subjectId: optionalUuid,
  schoolYearId: optionalUuid,
  isActive: z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN")
    const { searchParams } = new URL(request.url)
    const schoolYearId = searchParams.get("schoolYearId") || undefined
    const classId = searchParams.get("classId") || undefined
    const teacherId = searchParams.get("teacherId") || undefined
    const subjectId = searchParams.get("subjectId") || undefined

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        ...(schoolYearId ? { schoolYearId } : {}),
        ...(classId ? { classId } : {}),
        ...(teacherId ? { teacherId } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        teacher: true,
        class: { include: { schoolYear: true } },
        subject: true,
        schoolYear: true,
      },
      orderBy: [{ createdAt: "desc" }],
    })
    return NextResponse.json(assignments)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole("ADMIN")
    const payload = await request.json()
    const data = assignmentSchema.safeParse(payload)
    if (!data.success) {
      const message = data.error.issues[0]?.message ?? "Invalid input"
      return NextResponse.json({ error: message, details: data.error.issues }, { status: 400 })
    }

    const { teacherId, classId, subjectId } = data.data
    if (!teacherId || !classId || !subjectId) {
      return NextResponse.json(
        { error: "Uzupełnij nauczyciela, klasę i przedmiot." },
        { status: 400 }
      )
    }

    let schoolYearId = data.data.schoolYearId
    if (!schoolYearId) {
      const activeYears = await prisma.schoolYear.findMany({ where: { isActive: true } })
      if (activeYears.length === 0) {
        return NextResponse.json({ error: "No active school year found" }, { status: 400 })
      }
      if (activeYears.length > 1) {
        return NextResponse.json(
          { error: "Multiple active school years found. Choose a school year explicitly." },
          { status: 400 }
        )
      }
      schoolYearId = activeYears[0].id
    }

    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId,
        classId,
        subjectId,
        schoolYearId,
        isActive: data.data.isActive ?? true,
      },
    })
    await logAuditEvent({
      action: "admin.teacherAssignment.create",
      entityType: "teacherAssignment",
      entityId: assignment.id,
      entityLabel: `${assignment.teacherId}:${assignment.classId}:${assignment.subjectId}`,
      actorId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      metadata: {
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        schoolYearId: assignment.schoolYearId,
        isActive: assignment.isActive,
      },
      ...getRequestMeta(request),
    })
    return NextResponse.json(assignment, { status: 201 })
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target ?? []) as string[]
      if (target.includes("subjectId") && target.includes("classId") && target.includes("schoolYearId")) {
        return NextResponse.json(
          { error: "Przedmiot jest już przypisany do tej klasy w tym roku." },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: "Przypisanie już istnieje" }, { status: 409 })
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
