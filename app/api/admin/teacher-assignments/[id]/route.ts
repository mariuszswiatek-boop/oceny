import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const updateSchema = z.object({
  teacherId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  schoolYearId: z.string().uuid().optional(),
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
    const updated = await prisma.teacherAssignment.update({
      where: { id },
      data,
    })
    await logAuditEvent({
      action: "admin.teacherAssignment.update",
      entityType: "teacherAssignment",
      entityId: updated.id,
      entityLabel: `${updated.teacherId}:${updated.classId}:${updated.subjectId}`,
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target ?? []) as string[]
      if (target.includes("subjectId") && target.includes("classId") && target.includes("schoolYearId")) {
        return NextResponse.json(
          { error: "Przedmiot jest już przypisany do tej klasy w tym roku." },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: "Przypisanie już istnieje" }, { status: 409 })
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
    const existing = await prisma.teacherAssignment.findUnique({
      where: { id },
      select: { teacherId: true, classId: true, subjectId: true, schoolYearId: true },
    })
    await prisma.teacherAssignment.delete({ where: { id } })
    await logAuditEvent({
      action: "admin.teacherAssignment.delete",
      entityType: "teacherAssignment",
      entityId: id,
      entityLabel: existing
        ? `${existing.teacherId}:${existing.classId}:${existing.subjectId}`
        : "unknown",
      actorId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      metadata: { schoolYearId: existing?.schoolYearId ?? null },
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
