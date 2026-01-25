import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const updateSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
  studentId: z.string().uuid().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole("ADMIN")
    const { id } = await params
    const data = updateSchema.parse(await request.json())
    const updated = await prisma.parentContact.update({
      where: { id },
      data,
    })
    await logAuditEvent({
      action: "admin.parentContact.update",
      entityType: "parentContact",
      entityId: updated.id,
      entityLabel: updated.email,
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
    const existing = await prisma.parentContact.findUnique({
      where: { id },
      select: { email: true },
    })
    await prisma.parentContact.delete({ where: { id } })
    await logAuditEvent({
      action: "admin.parentContact.delete",
      entityType: "parentContact",
      entityId: id,
      entityLabel: existing?.email ?? "unknown",
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
