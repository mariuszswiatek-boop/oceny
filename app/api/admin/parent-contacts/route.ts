import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

const contactSchema = z.object({
  studentId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN")
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId") || undefined
    const contacts = await prisma.parentContact.findMany({
      where: studentId ? { studentId } : {},
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    })
    return NextResponse.json(contacts)
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
    const data = contactSchema.parse(await request.json())
    const contact = await prisma.parentContact.create({
      data: {
        studentId: data.studentId,
        email: data.email,
        fullName: data.fullName ?? null,
        phone: data.phone ?? null,
        isPrimary: data.isPrimary ?? false,
      },
    })
    return NextResponse.json(contact, { status: 201 })
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
