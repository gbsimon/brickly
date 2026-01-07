// API route for set operations
// POST /api/sets - Add a set to the database
// DELETE /api/sets/[setNum] - Remove a set from the database

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { addSetToDB } from "@/lib/db/sets"
import { ensureUser } from "@/lib/db/users"
import { createLogger } from "@/lib/logger"
import type { SetDetail } from "@/rebrickable/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
	const logger = createLogger(request)
	
	try {
		const session = await auth()

		if (!session?.user?.id) {
			logger.warn("Unauthorized request to add set")
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		// Ensure user exists in database and resolve the canonical user id
		const user = await ensureUser(session.user.id, session.user.email, session.user.name, session.user.image)
		const userLogger = logger.child({ userId: user.id })

		const set: SetDetail = await request.json()

		if (!set.setNum || !set.name) {
			userLogger.warn("Invalid set data provided", { setNum: set.setNum, hasName: !!set.name })
			return NextResponse.json({ error: "Invalid set data" }, { status: 400 })
		}

		userLogger.info("Adding set to database", { setNum: set.setNum })
		await addSetToDB(user.id, set)

		userLogger.info("Set added successfully", { setNum: set.setNum })
		return NextResponse.json({ success: true })
	} catch (err: any) {
		logger.error("Failed to add set", err)
		return NextResponse.json(
			createErrorResponse(err, "Failed to add set"),
			{ status: 500 }
		)
	}
}
