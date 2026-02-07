// Prisma client singleton for Next.js
// Prevents multiple instances in development

import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"

const accelerateUrl = process.env.PRISMA_DATABASE_URL

if (!accelerateUrl) {
	console.error("Error: PRISMA_DATABASE_URL is required when using Accelerate.")
}

const prismaConfig: {
	accelerateUrl?: string
	log: ("query" | "error" | "warn")[]
} = {
	log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
	...(accelerateUrl ? { accelerateUrl } : {}),
}

// Check if database URL is configured (for better error messages)
const databaseUrl = process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL

if (!databaseUrl) {
	console.error("Error: No database URL found. Set DATABASE_URL in Railway environment variables.")
}

function makePrismaClient() {
	return new PrismaClient(prismaConfig).$extends(withAccelerate())
}

type ExtendedPrismaClient = ReturnType<typeof makePrismaClient>

const globalForPrisma = globalThis as unknown as {
	prisma: ExtendedPrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? makePrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
