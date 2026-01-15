import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}


let prisma: PrismaClient;
try {
  prisma = globalForPrisma.prisma ?? new PrismaClient()
} catch (error: any) {
  console.error('PRISMA ERROR:', error);
  throw error;
}

export { prisma }

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
