import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const user = await requireRole("TEACHER")
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")
    const schoolYearId = searchParams.get("schoolYearId")

    const subjects = await prisma.subject.findMany({
      where: {
        teacherAssignments: {
          some: {
            teacherId: user.id,
            ...(classId ? { classId } : {}),
            ...(schoolYearId ? { schoolYearId } : {}),
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(subjects)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
