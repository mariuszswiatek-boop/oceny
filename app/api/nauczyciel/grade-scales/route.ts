import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    await requireRole("TEACHER")
    const { searchParams } = new URL(request.url)
    const term = searchParams.get("term")

    const termFilter =
      term === "FINAL"
        ? { appliesToFinal: true }
        : term === "MIDYEAR"
          ? { appliesToMidyear: true }
          : {}

    const gradeScales = await prisma.montessoriGradeScale.findMany({
      where: {
        isActive: true,
        ...termFilter,
      },
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
