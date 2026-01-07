// API route to sync sets from database to client
// GET /api/sets/sync - Returns all sets for the authenticated user

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserSets } from "@/lib/db/sets"
import { ensureUser } from "@/lib/db/users"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
	try {
		const session = await auth()

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		// Log environment info (without exposing secrets)
		const hasDatabaseUrl = Boolean(process.env.DATABASE_URL)
		const hasPrismaUrl = Boolean(process.env.PRISMA_DATABASE_URL)
		console.log(`[SYNC] Environment check: DATABASE_URL=${hasDatabaseUrl}, PRISMA_DATABASE_URL=${hasPrismaUrl}`)

		// Test database connection first
		try {
			// Ensure user exists in database
			await ensureUser(session.user.id, session.user.email, session.user.name, session.user.image)
		} catch (dbError: any) {
			console.error("[SYNC] Database connection error in ensureUser:", {
				message: dbError?.message,
				code: dbError?.code,
				name: dbError?.name,
				meta: dbError?.meta,
			})
			throw dbError
		}

		const sets = await getUserSets(session.user.id)
		console.log(`[SYNC] Successfully fetched ${sets.length} sets for user ${session.user.id}`)

		return NextResponse.json({ sets })
	} catch (err: any) {
		console.error("[SYNC] SETS_API_ERROR", {
			message: err?.message,
			code: err?.code,
			name: err?.name,
			meta: err?.meta,
			stack: err?.stack,
		})
		return NextResponse.json(
			{
				ok: false,
				message: err?.message || "Internal server error",
				code: err?.code,
				meta: err?.meta,
				name: err?.name,
			},
			{ status: 500 }
		)
	}
}
