import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
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
    const data = assignmentSchema.parse(await request.json())
    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId: data.teacherId,
        classId: data.classId,
        subjectId: data.subjectId,
        schoolYearId: data.schoolYearId,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(assignment, { status: 201 })
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
