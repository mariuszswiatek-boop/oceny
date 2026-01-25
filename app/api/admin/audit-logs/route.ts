import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN")
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim() || ""
    const action = searchParams.get("action") || undefined
    const entityType = searchParams.get("entityType") || undefined
    const actorId = searchParams.get("actorId") || undefined
    const successParam = searchParams.get("success")
    const success =
      successParam === "true" ? true : successParam === "false" ? false : undefined
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined
    const page = Math.max(1, Number(searchParams.get("page") || 1))
    const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 50)))

    const where: any = {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(actorId ? { actorId } : {}),
      ...(success !== undefined ? { success } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }

    if (q) {
      where.OR = [
        { actorEmail: { contains: q, mode: "insensitive" } },
        { action: { contains: q, mode: "insensitive" } },
        { entityType: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { entityLabel: { contains: q, mode: "insensitive" } },
        { ip: { contains: q, mode: "insensitive" } },
        { userAgent: { contains: q, mode: "insensitive" } },
      ]
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({ items, total, page, pageSize })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 403 : 500 }
    )
  }
}
