import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isLegacyLabel = (label: string | null) => {
  if (!label) return true
  if (!label.includes(":")) return false
  const parts = label.split(":")
  if (parts.length < 2) return false
  return parts.every((part) => uuidRegex.test(part) || part === "MIDYEAR" || part === "FINAL")
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

async function backfillBatch(limit: number) {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: "studentGrade",
      entityId: { not: null },
      OR: [{ entityLabel: null }, { entityLabel: { contains: ":" } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  let updated = 0
  for (const log of logs) {
    if (!isLegacyLabel(log.entityLabel)) continue
    const grade = await prisma.studentGrade.findUnique({
      where: { id: log.entityId! },
      include: {
        student: { select: { firstName: true, lastName: true, class: { select: { name: true } } } },
        subject: { select: { name: true } },
        gradeScale: { select: { label: true } },
      },
    })
    if (!grade) continue

    const studentLabel = `${grade.student.lastName} ${grade.student.firstName}`
    const entityLabel = `${studentLabel} | ${grade.student.class.name} | ${grade.subject.name} | ${grade.term} | ${
      grade.gradeScale?.label ?? "BRAK"
    }`

    const metadata = isPlainObject(log.metadata) ? { ...log.metadata } : {}
    metadata.studentLabel = metadata.studentLabel ?? studentLabel
    metadata.className = metadata.className ?? grade.student.class.name
    metadata.subjectName = metadata.subjectName ?? grade.subject.name
    metadata.gradeScaleLabel = metadata.gradeScaleLabel ?? grade.gradeScale?.label ?? null

    await prisma.auditLog.update({
      where: { id: log.id },
      data: {
        entityLabel,
        metadata,
      },
    })
    updated += 1
  }

  return { processed: logs.length, updated }
}

async function main() {
  const batchSize = 200
  let totalProcessed = 0
  let totalUpdated = 0

  while (true) {
    const { processed, updated } = await backfillBatch(batchSize)
    totalProcessed += processed
    totalUpdated += updated
    if (processed < batchSize) break
  }

  console.log(`Audit log backfill complete. processed=${totalProcessed} updated=${totalUpdated}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
