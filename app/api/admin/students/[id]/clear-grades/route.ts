import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole("ADMIN")
    const { id } = await params
    const student = await prisma.student.findUnique({
      where: { id },
      select: { firstName: true, lastName: true },
    })
    const deleted = await prisma.studentGrade.deleteMany({ where: { studentId: id } })
    await logAuditEvent({
      action: "admin.student.clear_grades",
      entityType: "student",
      entityId: id,
      entityLabel: student ? `${student.firstName} ${student.lastName}`.trim() : "unknown",
      actorId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      metadata: { deletedCount: deleted.count },
      ...getRequestMeta(request),
    })
    return NextResponse.json({ deletedCount: deleted.count })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
