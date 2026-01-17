import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN")
    const data = updateSchema.parse(await request.json())
    const updated = await prisma.subject.update({
      where: { id: params.id },
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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN")
    const [assignmentCount, gradeCount] = await Promise.all([
      prisma.teacherAssignment.count({ where: { subjectId: params.id } }),
      prisma.studentGrade.count({ where: { subjectId: params.id } }),
    ])
    if (assignmentCount > 0 || gradeCount > 0) {
      return NextResponse.json(
        { error: "Subject is used in historical data. Archive it instead." },
        { status: 409 }
      )
    }
    await prisma.subject.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
