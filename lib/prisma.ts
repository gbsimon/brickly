// Prisma client singleton for Next.js
// Prevents multiple instances in development

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined
}

// Use Prisma Accelerate if PRISMA_DATABASE_URL is set, otherwise use standard connection
const prismaConfig: {
	accelerateUrl?: string
	log: ("query" | "error" | "warn")[]
} = {
	log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
}

// Only add accelerateUrl if PRISMA_DATABASE_URL is set (for Prisma Accelerate)
// Otherwise, Prisma will use DATABASE_URL from prisma.config.ts
if (process.env.PRISMA_DATABASE_URL) {
	prismaConfig.accelerateUrl = process.env.PRISMA_DATABASE_URL
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
