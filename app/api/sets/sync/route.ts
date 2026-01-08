// API route to sync sets from database to client
// GET /api/sets/sync - Returns all sets for the authenticated user

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserSets, updateSetThemeNames } from "@/lib/db/sets"
import { ensureUser } from "@/lib/db/users"
import { createRebrickableClient } from "@/rebrickable/client"
import { createLogger, createErrorResponse } from "@/lib/logger"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
	const logger = createLogger(request)
	
	try {
		const session = await auth()

		if (!session?.user?.id) {
			logger.warn("Unauthorized request to sync sets")
			return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
		}

		// Test database connection first
		let userId = session.user.id
		try {
			// Ensure user exists in database and resolve the canonical user id
			const user = await ensureUser(session.user.id, session.user.email, session.user.name, session.user.image)
			userId = user.id
			const userLogger = logger.child({ userId: user.id })
			
			// Log environment info (without exposing secrets)
			const hasDatabaseUrl = Boolean(process.env.DATABASE_URL)
			const hasPrismaUrl = Boolean(process.env.PRISMA_DATABASE_URL)
			userLogger.debug("Environment check", { hasDatabaseUrl, hasPrismaUrl })
		} catch (dbError: any) {
			logger.error("Database connection error in ensureUser", dbError)
			throw dbError
		}

		const userLogger = logger.child({ userId })
		userLogger.info("Fetching user sets")
		let sets = await getUserSets(userId)
		
		// Backfill theme names for sets that don't have them
		const client = createRebrickableClient()
		const setsToUpdate: Array<{ setNum: string; themeName: string }> = []
		
		for (const set of sets) {
			if (!set.themeName && set.themeId) {
				try {
					const theme = await client.getTheme(set.themeId)
					set.themeName = theme.name
					setsToUpdate.push({ setNum: set.setNum, themeName: theme.name })
				} catch (error) {
					userLogger.warn("Failed to fetch theme name", { setNum: set.setNum, themeId: set.themeId, error })
					// Continue without theme name
				}
			}
		}
		
		// Update sets in database if we fetched any theme names
		if (setsToUpdate.length > 0) {
			for (const { setNum, themeName } of setsToUpdate) {
				try {
					await updateSetThemeNames(userId, setNum, themeName)
				} catch (error) {
					userLogger.warn("Failed to update theme name in DB", { setNum, error })
				}
			}
		}
		
		userLogger.logRequest(200, { count: sets.length, themeNamesBackfilled: setsToUpdate.length })

		return NextResponse.json({ sets })
	} catch (err: any) {
		logger.error("Failed to sync sets", err)
		return NextResponse.json(
			createErrorResponse(err, "Failed to sync sets"),
			{ status: 500 }
		)
	}
}
