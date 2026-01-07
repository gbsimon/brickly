// Prisma client singleton for Next.js
// Prevents multiple instances in development

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined
}

const accelerateUrl = process.env.PRISMA_DATABASE_URL
const prismaConfig: {
	accelerateUrl?: string
	log: ("query" | "error" | "warn")[]
} = {
	log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
	...(accelerateUrl ? { accelerateUrl } : {}),
}

// Check if database URL is configured (for better error messages)
// Prisma Client will use DATABASE_URL automatically, but we check here for logging
const databaseUrl = process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL

if (!databaseUrl) {
	console.error("Error: No database URL found. Set DATABASE_URL in Vercel environment variables.")
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
