import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { getRequestMeta, logAuditEvent } from "@/lib/audit"

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roles: z.array(z.enum(["ADMIN", "TEACHER", "HOMEROOM", "READONLY"])).min(1),
  isActive: z.boolean().optional(),
})

export async function GET() {
  try {
    await requireRole("ADMIN")
    const users = await prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })
    return NextResponse.json(users)
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
    const data = userSchema.parse(await request.json())
    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: data.roles,
        isActive: data.isActive ?? true,
      },
    })
    await logAuditEvent({
      action: "admin.user.create",
      entityType: "user",
      entityId: user.id,
      entityLabel: `${user.firstName} ${user.lastName}`,
      actorId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      metadata: { email: user.email, roles: user.roles },
      ...getRequestMeta(request),
    })
    return NextResponse.json(user, { status: 201 })
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
