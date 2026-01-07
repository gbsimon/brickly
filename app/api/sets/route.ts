// API route for set operations
// POST /api/sets - Add a set to the database
// DELETE /api/sets/[setNum] - Remove a set from the database

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { addSetToDB } from "@/lib/db/sets"
import { ensureUser } from "@/lib/db/users"
import type { SetDetail } from "@/rebrickable/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
	try {
		const session = await auth()

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		// Ensure user exists in database and resolve the canonical user id
		const user = await ensureUser(session.user.id, session.user.email, session.user.name, session.user.image)

		const set: SetDetail = await request.json()

		if (!set.setNum || !set.name) {
			return NextResponse.json({ error: "Invalid set data" }, { status: 400 })
		}

		await addSetToDB(user.id, set)

		return NextResponse.json({ success: true })
	} catch (err: any) {
		console.error("SETS_API_ERROR", err)
		return NextResponse.json(
			{
				ok: false,
				message: err?.message,
				code: err?.code,
				meta: err?.meta,
			},
			{ status: 500 }
		)
	}
}
