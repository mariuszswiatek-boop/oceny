import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params
    const data = updateSchema.parse(await request.json())
    const current = await prisma.schoolYear.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json({ error: "School year not found" }, { status: 404 })
    }

    if (data.isActive === false) {
      const activeCount = await prisma.schoolYear.count({ where: { isActive: true } })
      if (current.isActive && activeCount <= 1) {
        return NextResponse.json(
          { error: "At least one school year must remain active" },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.schoolYear.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        startDate: data.startDate === undefined ? undefined : data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate === undefined ? undefined : data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? undefined,
        sortOrder: data.sortOrder ?? undefined,
      },
    })

    if (data.isActive) {
      await prisma.schoolYear.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      })
    }

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
    const schoolYear = await prisma.schoolYear.findUnique({ where: { id } })
    if (!schoolYear) {
      return NextResponse.json({ error: "School year not found" }, { status: 404 })
    }

    const [classesCount, gradesCount, assignmentsCount] = await Promise.all([
      prisma.class.count({ where: { schoolYearId: id } }),
      prisma.studentGrade.count({ where: { schoolYearId: id } }),
      prisma.teacherAssignment.count({ where: { schoolYearId: id } }),
    ])

    if (classesCount > 0 || gradesCount > 0 || assignmentsCount > 0) {
      return NextResponse.json(
        { error: "School year is used in historical data. Archive it instead." },
        { status: 409 }
      )
    }

    if (schoolYear.isActive) {
      const activeCount = await prisma.schoolYear.count({ where: { isActive: true } })
      if (activeCount <= 1) {
        return NextResponse.json(
          { error: "At least one school year must remain active" },
          { status: 400 }
        )
      }
    }

    await prisma.schoolYear.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
