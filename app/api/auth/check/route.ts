// API route to check auth configuration status
// GET /api/auth/check - Returns auth configuration status and available providers

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
	const warnings: string[] = []

	// Determine which providers are configured
	const isGoogleConfigured =
		!!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET
	const isAppleConfigured =
		!!process.env.AUTH_APPLE_ID && !!process.env.AUTH_APPLE_SECRET
	const isEmailConfigured =
		!!process.env.AUTH_EMAIL_SERVER && !!process.env.AUTH_EMAIL_FROM
	const isDatabaseConfigured = !!process.env.DATABASE_URL
	const hasSecret = !!process.env.NEXTAUTH_SECRET

	// Build missing list for truly required items
	const missing: string[] = []

	if (!hasSecret) {
		missing.push("NEXTAUTH_SECRET")
	}

	if (!isGoogleConfigured && !isAppleConfigured && !isEmailConfigured) {
		missing.push(
			"At least one auth provider (Google, Apple, or Email)"
		)
	}

	// Check recommended vars
	if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
		warnings.push(
			"AUTH_URL or NEXTAUTH_URL should be set for proper callback handling"
		)
	}

	// Warn if email is configured but DB is not
	if (isEmailConfigured && !isDatabaseConfigured) {
		warnings.push(
			"Email provider requires DATABASE_URL for verification tokens. Email sign-in will not work without it."
		)
	}

	const isConfigured = missing.length === 0

	return NextResponse.json({
		ok: isConfigured,
		configured: isConfigured,
		missing,
		warnings,
		providers: {
			google: isGoogleConfigured,
			apple: isAppleConfigured,
			email: isEmailConfigured && isDatabaseConfigured,
		},
		message: isConfigured
			? "Authentication is properly configured"
			: `Missing required configuration: ${missing.join(", ")}`,
	})
}
