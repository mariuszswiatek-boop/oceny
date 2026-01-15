import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const user = await requireRole("NAUCZYCIEL")

    const subjects = await prisma.subject.findMany({
      where: {
        teacherAssignments: {
          some: {
            teacherId: user.id,
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
