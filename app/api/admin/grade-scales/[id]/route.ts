import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  colorHex: z.string().min(4).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  appliesToMidyear: z.boolean().optional(),
  appliesToFinal: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole("ADMIN")
    const { id } = await params
    const data = updateSchema.parse(await request.json())
    const updated = await prisma.montessoriGradeScale.update({
      where: { id },
      data,
    })
    await logAuditEvent({
      action: "admin.gradeScale.update",
      entityType: "gradeScale",
      entityId: updated.id,
      entityLabel: updated.label,
      actorId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      metadata: { fields: Object.keys(data) },
      ...getRequestMeta(request),
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole("ADMIN")
    const { id } = await params
    const existing = await prisma.montessoriGradeScale.findUnique({
      where: { id },
      select: { label: true },
    })
    const gradeCount = await prisma.studentGrade.count({ where: { gradeScaleId: id } })
    if (gradeCount > 0) {
      return NextResponse.json(
        { error: "Grade scale is used in historical data. Archive it instead." },
        { status: 409 }
      )
    }
    await prisma.montessoriGradeScale.delete({ where: { id } })
    await logAuditEvent({
      action: "admin.gradeScale.delete",
      entityType: "gradeScale",
      entityId: id,
      entityLabel: existing?.label ?? "unknown",
      actorId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      ...getRequestMeta(request),
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
