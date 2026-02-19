import NextAuth, { type NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Apple from "next-auth/providers/apple"
import Nodemailer from "next-auth/providers/nodemailer"
import { PostgresAdapter } from "@/lib/db/auth-adapter"
import { sendBricklyVerificationRequest } from "@/lib/auth-email"

// Determine which providers are configured
const isGoogleConfigured =
	!!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET
const isAppleConfigured =
	!!process.env.AUTH_APPLE_ID && !!process.env.AUTH_APPLE_SECRET
const isEmailConfigured =
	!!process.env.AUTH_EMAIL_SERVER && !!process.env.AUTH_EMAIL_FROM
const isDatabaseConfigured = !!process.env.DATABASE_URL

// Build providers list based on available env vars
const providers: NextAuthConfig["providers"] = []

if (isGoogleConfigured) {
	providers.push(
		Google({
			clientId: process.env.AUTH_GOOGLE_ID,
			clientSecret: process.env.AUTH_GOOGLE_SECRET,
		})
	)
}

if (isAppleConfigured) {
	providers.push(
		Apple({
			clientId: process.env.AUTH_APPLE_ID,
			clientSecret: process.env.AUTH_APPLE_SECRET!,
		})
	)
}

if (isEmailConfigured && isDatabaseConfigured) {
	providers.push(
		Nodemailer({
			server: process.env.AUTH_EMAIL_SERVER,
			from: process.env.AUTH_EMAIL_FROM,
			sendVerificationRequest: sendBricklyVerificationRequest,
		})
	)
}

// Validate that at least one provider is configured
function validateAuthEnv() {
	const issues: string[] = []

	if (!isGoogleConfigured && !isAppleConfigured && !isEmailConfigured) {
		issues.push(
			"No auth providers configured. Set AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET, AUTH_APPLE_ID + AUTH_APPLE_SECRET, or AUTH_EMAIL_SERVER + AUTH_EMAIL_FROM."
		)
	}

	if (!process.env.NEXTAUTH_SECRET) {
		issues.push("NEXTAUTH_SECRET is required")
	}

	if (isEmailConfigured && !isDatabaseConfigured) {
		issues.push(
			"EMAIL provider requires DATABASE_URL for verification tokens"
		)
	}

	if (issues.length > 0) {
		throw new Error(
			`Auth configuration issues:\n${issues.join("\n")}\n\nSee .env.example for reference.`
		)
	}
}

// Validate on module load (only in non-production to avoid startup errors)
if (process.env.NODE_ENV !== "production") {
	try {
		validateAuthEnv()
	} catch (error) {
		console.error(
			"[AUTH] Configuration error:",
			error instanceof Error ? error.message : error
		)
	}
}

// Use the database adapter when DATABASE_URL is available
// Required for Email provider (verification tokens) and recommended for
// proper account linking across providers
const adapter = isDatabaseConfigured ? PostgresAdapter() : undefined

export const { handlers, signIn, signOut, auth } = NextAuth({
	secret: process.env.NEXTAUTH_SECRET,
	providers,
	adapter,
	trustHost: true,
	pages: {
		signIn: "/auth/signin",
		verifyRequest: "/auth/verify-request",
	},
	// Use JWT strategy to minimize cookie size (important for Railway's 8KB header limit)
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	// Minimize JWT token payload to reduce cookie size
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.sub = user.id
			}
			return token
		},
		async session({ session, token }) {
			if (session.user && token.sub) {
				session.user.id = token.sub
			}
			return session
		},
	},
})
