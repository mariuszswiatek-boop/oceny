import { prisma } from "@/lib/prisma"
import { Prisma, UserRole } from "@prisma/client"

type JsonInput = Prisma.InputJsonValue | Prisma.NullTypes.JsonNull

type AuditLogInput = {
  action: string
  entityType: string
  entityId?: string | null
  entityLabel?: string | null
  actorId?: string | null
  actorEmail?: string | null
  actorRoles?: UserRole[] | string[] | null
  ip?: string | null
  userAgent?: string | null
  success?: boolean
  metadata?: Prisma.InputJsonValue | null
}

const REDACT_KEYS = /password|secret|token/i

const sanitizeMetadata = (value: unknown, depth = 0): JsonInput => {
  if (depth > 6) return "[REDACTED_DEPTH]"
  if (value === null || value === undefined) return Prisma.JsonNull
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  if (typeof value === "bigint") return value.toString()
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item, depth + 1)) as JsonInput
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEYS.test(key)) {
        result[key] = "[REDACTED]"
      } else {
        result[key] = sanitizeMetadata(val, depth + 1)
      }
    }
    return result as JsonInput
  }
  return String(value)
}

export const getRequestMeta = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for") ?? ""
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null
  const userAgent = request.headers.get("user-agent")
  return { ip, userAgent }
}

export const logAuditEvent = async (input: AuditLogInput) => {
  try {
    const roles = (input.actorRoles ?? []) as UserRole[]
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        actorRoles: roles,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        success: input.success ?? true,
        metadata:
          input.metadata === null
            ? Prisma.JsonNull
            : input.metadata
              ? sanitizeMetadata(input.metadata)
              : undefined,
      },
    })
  } catch {
    // Logging must never block main flow.
  }
}
