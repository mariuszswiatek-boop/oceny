import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const activeYear = await prisma.schoolYear.findFirst({
      where: {
        isActive: true,
      },
    })

    if (!activeYear) {
      return NextResponse.json(
        { error: "No active school year found" },
        { status: 404 }
      )
    }

    return NextResponse.json(activeYear)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
