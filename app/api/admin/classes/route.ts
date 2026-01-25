import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const classSchema = z.object({
  name: z.string().min(1),
  schoolYearId: z.string().uuid(),
  teacherId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN")
    const { searchParams } = new URL(request.url)
    const schoolYearId = searchParams.get("schoolYearId")
    const where = schoolYearId ? { schoolYearId } : {}
    const classes = await prisma.class.findMany({
      where,
      include: { schoolYear: true, teacher: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
    return NextResponse.json(classes)
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
    const data = classSchema.parse(await request.json())
    const created = await prisma.class.create({
      data: {
        name: data.name,
        schoolYearId: data.schoolYearId,
        teacherId: data.teacherId ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    })
    await logAuditEvent({
      action: "admin.class.create",
      entityType: "class",
      entityId: created.id,
      entityLabel: created.name,
      actorId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      metadata: { schoolYearId: created.schoolYearId, teacherId: created.teacherId },
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
