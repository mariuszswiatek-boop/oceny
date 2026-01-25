import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
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
    const updated = await prisma.subject.update({
      where: { id },
      data,
    })
    await logAuditEvent({
      action: "admin.subject.update",
      entityType: "subject",
      entityId: updated.id,
      entityLabel: updated.name,
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
    const existing = await prisma.subject.findUnique({
      where: { id },
      select: { name: true },
    })
    const [assignmentCount, gradeCount] = await Promise.all([
      prisma.teacherAssignment.count({ where: { subjectId: id } }),
      prisma.studentGrade.count({ where: { subjectId: id } }),
    ])
    if (assignmentCount > 0 || gradeCount > 0) {
      return NextResponse.json(
        { error: "Subject is used in historical data. Archive it instead." },
        { status: 409 }
      )
    }
    await prisma.subject.delete({ where: { id } })
    await logAuditEvent({
      action: "admin.subject.delete",
      entityType: "subject",
      entityId: id,
      entityLabel: existing?.name ?? "unknown",
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
