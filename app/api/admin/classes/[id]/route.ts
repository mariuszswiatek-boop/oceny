import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  schoolYearId: z.string().uuid().optional(),
  teacherId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params
    const data = updateSchema.parse(await request.json())
    const updated = await prisma.class.update({
      where: { id },
      data,
    })
    return NextResponse.json(updated)
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

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params
    const [studentsCount, assignmentsCount] = await Promise.all([
      prisma.student.count({ where: { classId: id } }),
      prisma.teacherAssignment.count({ where: { classId: id } }),
    ])
    if (studentsCount > 0 || assignmentsCount > 0) {
      return NextResponse.json(
        { error: "Class is used in historical data. Archive it instead." },
        { status: 409 }
      )
    }
    await prisma.class.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
