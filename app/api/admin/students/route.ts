import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

const studentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  classId: z.string().uuid(),
  isActive: z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN")
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId") || undefined
    const students = await prisma.student.findMany({
      where: classId ? { classId } : {},
      include: { class: { include: { schoolYear: true } }, parentContacts: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })
    return NextResponse.json(students)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("ADMIN")
    const data = studentSchema.parse(await request.json())
    const student = await prisma.student.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        classId: data.classId,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(student, { status: 201 })
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
