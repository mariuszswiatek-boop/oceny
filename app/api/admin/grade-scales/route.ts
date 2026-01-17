import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

const gradeScaleSchema = z.object({
  label: z.string().min(1),
  colorHex: z.string().min(4),
  sortOrder: z.number().int(),
  isActive: z.boolean().optional(),
})

export async function GET() {
  try {
    await requireRole("ADMIN")
    const scales = await prisma.montessoriGradeScale.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    })
    return NextResponse.json(scales)
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
    const data = gradeScaleSchema.parse(await request.json())
    const scale = await prisma.montessoriGradeScale.create({
      data: {
        label: data.label,
        colorHex: data.colorHex,
        sortOrder: data.sortOrder,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(scale, { status: 201 })
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
