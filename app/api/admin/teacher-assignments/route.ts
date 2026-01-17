import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/permissions"

const assignmentSchema = z.object({
  teacherId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  schoolYearId: z.string().uuid(),
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
      return NextResponse.json({ error: "Invalid input", details: data.error.issues }, { status: 400 })
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
        teacherId: data.data.teacherId,
        classId: data.data.classId,
        subjectId: data.data.subjectId,
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
