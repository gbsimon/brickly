// API route to check auth configuration status
// GET /api/auth/check - Returns auth configuration status

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
	const missing: string[] = []
	const warnings: string[] = []
	
	// Check required vars
	if (!process.env.AUTH_GOOGLE_ID) {
		missing.push("AUTH_GOOGLE_ID")
	}
	if (!process.env.AUTH_GOOGLE_SECRET) {
		missing.push("AUTH_GOOGLE_SECRET")
	}
	if (!process.env.NEXTAUTH_SECRET) {
		missing.push("NEXTAUTH_SECRET")
	}
	
	// Check recommended vars
	if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
		warnings.push("AUTH_URL or NEXTAUTH_URL should be set for proper callback handling")
	}
	
	const isConfigured = missing.length === 0
	
	return NextResponse.json({
		ok: isConfigured,
		configured: isConfigured,
		missing,
		warnings,
		message: isConfigured
			? "Authentication is properly configured"
			: `Missing required environment variables: ${missing.join(", ")}`,
	})
}

