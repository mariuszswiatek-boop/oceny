import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await requireRole("TEACHER")

    const gradeScales = await prisma.montessoriGradeScale.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    })

    return NextResponse.json(gradeScales)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
