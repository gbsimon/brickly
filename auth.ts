import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Validate required environment variables
function validateAuthEnv() {
	const missing: string[] = []
	
	if (!process.env.AUTH_GOOGLE_ID) {
		missing.push("AUTH_GOOGLE_ID")
	}
	if (!process.env.AUTH_GOOGLE_SECRET) {
		missing.push("AUTH_GOOGLE_SECRET")
	}
	if (!process.env.NEXTAUTH_SECRET) {
		missing.push("NEXTAUTH_SECRET")
	}
	
	if (missing.length > 0) {
		const errorMessage = `Missing required authentication environment variables: ${missing.join(", ")}\n\n` +
			`Please set these in your .env.local file. See .env.example for reference.`
		throw new Error(errorMessage)
	}
}

// Validate on module load (only in non-production to avoid startup errors in production)
if (process.env.NODE_ENV !== "production") {
	try {
		validateAuthEnv()
	} catch (error) {
		// Log error but don't throw - allows app to start and show error page
		console.error("[AUTH] Configuration error:", error instanceof Error ? error.message : error)
	}
}

export const { handlers, signIn, signOut, auth } = NextAuth({
	secret: process.env.NEXTAUTH_SECRET,
	providers: [
		Google({
			clientId: process.env.AUTH_GOOGLE_ID,
			clientSecret: process.env.AUTH_GOOGLE_SECRET,
		}),
	],
	trustHost: true,
	pages: {
		signIn: "/auth/signin",
	},
	callbacks: {
		async session({ session, token }) {
			if (session.user && token.sub) {
				session.user.id = token.sub
			}
			return session
		},
	},
})
