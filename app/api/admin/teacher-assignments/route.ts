import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/permissions"

const uuidField = z.string().uuid()
const optionalUuid = z.preprocess((value) => (value === "" ? undefined : value), uuidField.optional())
const optionalId = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional())

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
    await requireRole("ADMIN")
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
      const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } })
      if (!activeYear) {
        return NextResponse.json({ error: "No active school year found" }, { status: 400 })
      }
      schoolYearId = activeYear.id
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
    return NextResponse.json(assignment, { status: 201 })
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Przypisanie już istnieje" }, { status: 409 })
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
