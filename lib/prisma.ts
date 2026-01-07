// Prisma client singleton for Next.js
// Prevents multiple instances in development

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined
}

// Prisma Client automatically reads DATABASE_URL from environment variables
// For Vercel Postgres, ensure DATABASE_URL is set in Vercel environment variables
// For Prisma Accelerate, use PRISMA_DATABASE_URL (but Prisma Client still reads DATABASE_URL)
const prismaConfig: {
	log: ("query" | "error" | "warn")[]
} = {
	log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
}

// Check if database URL is configured (for better error messages)
// Prisma Client will use DATABASE_URL automatically, but we check here for logging
const databaseUrl = 
	process.env.DATABASE_URL || 
	process.env.PRISMA_DATABASE_URL || 
	process.env.POSTGRES_PRISMA_URL

if (!databaseUrl) {
	console.error("Error: No database URL found. Set DATABASE_URL in Vercel environment variables.")
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
