import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

const updateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "TEACHER", "HOMEROOM", "READONLY"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params
    const data = updateSchema.parse(await request.json())
    const update: any = { ...data }
    if (data.password) {
      update.password = await bcrypt.hash(data.password, 10)
    }
    const user = await prisma.user.update({
      where: { id },
      data: update,
    })
    return NextResponse.json(user)
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
    const [assignments, classes, grades] = await Promise.all([
      prisma.teacherAssignment.count({ where: { teacherId: id } }),
      prisma.class.count({ where: { teacherId: id } }),
      prisma.studentGrade.count({ where: { teacherId: id } }),
    ])
    if (assignments > 0 || classes > 0 || grades > 0) {
      return NextResponse.json(
        { error: "User is used in historical data. Deactivate instead." },
        { status: 409 }
      )
    }
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
