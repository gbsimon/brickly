import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET() {
	try {
		// Fast, doesn’t require any tables
		const result = await prisma.$queryRaw`SELECT 1 as ok`
		return NextResponse.json({
			ok: true,
			result,
			expectedEnv: ["DATABASE_URL", "PRISMA_DATABASE_URL"],
			hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
			hasPrismaDatabaseUrl: Boolean(process.env.PRISMA_DATABASE_URL),
			hasDirectUrl: Boolean(process.env.DIRECT_URL || process.env.POSTGRES_URL),
			envHint: {
				DATABASE_URL_prefix: process.env.DATABASE_URL?.slice(0, 20),
				PRISMA_DATABASE_URL_prefix: process.env.PRISMA_DATABASE_URL?.slice(0, 20),
				DIRECT_URL_prefix:
					process.env.DIRECT_URL?.slice(0, 20) ||
					process.env.POSTGRES_URL?.slice(0, 20),
			},
		})
	} catch (err: any) {
		console.error("DB_CHECK_ERROR", err)
		return NextResponse.json(
			{
				ok: false,
				name: err?.name,
				message: err?.message,
				code: err?.code,
				meta: err?.meta,
			},
			{ status: 500 }
		)
	}
}
