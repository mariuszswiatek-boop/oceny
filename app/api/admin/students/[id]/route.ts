import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const updateSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole("ADMIN")
    const { id } = await params
    const data = updateSchema.parse(await request.json())
    const updated = await prisma.student.update({
      where: { id },
      data,
    })
    await logAuditEvent({
      action: "admin.student.update",
      entityType: "student",
      entityId: updated.id,
      entityLabel: `${updated.firstName} ${updated.lastName}`,
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
    const existing = await prisma.student.findUnique({
      where: { id },
      select: { firstName: true, lastName: true },
    })
    const gradeCount = await prisma.studentGrade.count({ where: { studentId: id } })
    if (gradeCount > 0) {
      return NextResponse.json(
        { error: "Student has historical grades. Archive instead." },
        { status: 409 }
      )
    }
    await prisma.student.delete({ where: { id } })
    await logAuditEvent({
      action: "admin.student.delete",
      entityType: "student",
      entityId: id,
      entityLabel: existing
        ? `${existing.firstName} ${existing.lastName}`.trim()
        : "unknown",
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
