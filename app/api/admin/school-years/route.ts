import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const schoolYearSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  gradingTerm: z.enum(["MIDYEAR", "FINAL"]).optional(),
  isGradingOpen: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  try {
    await requireRole("ADMIN")
    const schoolYears = await prisma.schoolYear.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
    return NextResponse.json(schoolYears)
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
    const payload = schoolYearSchema.parse(await request.json())
    const activeCount = await prisma.schoolYear.count({ where: { isActive: true } })
    const shouldBeActive = payload.isActive ?? activeCount === 0

    const created = await prisma.schoolYear.create({
      data: {
        name: payload.name,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        isActive: shouldBeActive,
        gradingTerm: payload.gradingTerm ?? "MIDYEAR",
        isGradingOpen: payload.isGradingOpen ?? true,
        sortOrder: payload.sortOrder ?? 0,
      },
    })

    if (shouldBeActive) {
      await prisma.schoolYear.updateMany({
        where: { id: { not: created.id } },
        data: { isActive: false },
      })
    }

    await logAuditEvent({
      action: "admin.schoolYear.create",
      entityType: "schoolYear",
      entityId: created.id,
      entityLabel: created.name,
      actorId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      metadata: {
        isActive: created.isActive,
        gradingTerm: created.gradingTerm,
        isGradingOpen: created.isGradingOpen,
      },
      ...getRequestMeta(request),
    })
    return NextResponse.json(created, { status: 201 })
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
