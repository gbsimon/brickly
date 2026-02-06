import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
	// TEMPORARILY DISABLED: Prisma has been removed
	// Return a safe response indicating Prisma is disabled
	return NextResponse.json({
		ok: true,
		result: [{ ok: 1 }],
		prismaDisabled: true,
		message: "Prisma is temporarily disabled - app runs in offline/Dexie-only mode",
		hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
		hasPrismaDatabaseUrl: Boolean(process.env.PRISMA_DATABASE_URL),
	})
}
