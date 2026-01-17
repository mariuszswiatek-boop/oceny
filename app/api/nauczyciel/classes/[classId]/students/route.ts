import { NextResponse } from "next/server"
import { requireRole, canTeacherAccessClass } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const user = await requireRole("TEACHER")
    const { classId } = await params

    // Sprawdź uprawnienia
    const hasAccess = await canTeacherAccessClass(user.id, classId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const students = await prisma.student.findMany({
      where: {
        classId,
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    })

    return NextResponse.json(students)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
