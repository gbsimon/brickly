// Custom NextAuth adapter for the `postgres` library
// Supports user management, account linking, and verification tokens
// Integrates with the existing users table

import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters"
import { query } from "@/lib/db/client"

function toAdapterUser(row: {
	id: string
	email: string | null
	name: string | null
	image: string | null
	email_verified: Date | null
}): AdapterUser {
	return {
		id: row.id,
		email: row.email ?? "",
		name: row.name,
		image: row.image,
		emailVerified: row.email_verified,
	}
}

export function PostgresAdapter(): Adapter {
	return {
		async createUser(user) {
			const id = crypto.randomUUID()
			const now = new Date()
			const rows = await query<{
				id: string
				email: string | null
				name: string | null
				image: string | null
				email_verified: Date | null
			}>`INSERT INTO users (id, email, name, image, email_verified, "createdAt", "updatedAt")
			  VALUES (${id}, ${user.email}, ${user.name ?? null}, ${user.image ?? null}, ${user.emailVerified ?? null}, ${now}, ${now})
			  RETURNING id, email, name, image, email_verified`
			return toAdapterUser(rows[0])
		},

		async getUser(id) {
			const rows = await query<{
				id: string
				email: string | null
				name: string | null
				image: string | null
				email_verified: Date | null
			}>`SELECT id, email, name, image, email_verified FROM users WHERE id = ${id} LIMIT 1`
			return rows[0] ? toAdapterUser(rows[0]) : null
		},

		async getUserByEmail(email) {
			const rows = await query<{
				id: string
				email: string | null
				name: string | null
				image: string | null
				email_verified: Date | null
			}>`SELECT id, email, name, image, email_verified FROM users WHERE email = ${email} LIMIT 1`
			return rows[0] ? toAdapterUser(rows[0]) : null
		},

		async getUserByAccount({ provider, providerAccountId }) {
			const rows = await query<{
				id: string
				email: string | null
				name: string | null
				image: string | null
				email_verified: Date | null
			}>`SELECT u.id, u.email, u.name, u.image, u.email_verified
			  FROM users u
			  JOIN accounts a ON a.user_id = u.id
			  WHERE a.provider = ${provider}
			    AND a.provider_account_id = ${providerAccountId}
			  LIMIT 1`
			return rows[0] ? toAdapterUser(rows[0]) : null
		},

		async updateUser(user) {
			const rows = await query<{
				id: string
				email: string | null
				name: string | null
				image: string | null
				email_verified: Date | null
			}>`UPDATE users SET
			    email = COALESCE(${user.email ?? null}, email),
			    name = COALESCE(${user.name ?? null}, name),
			    image = COALESCE(${user.image ?? null}, image),
			    email_verified = COALESCE(${user.emailVerified ?? null}, email_verified),
			    "updatedAt" = ${new Date()}
			  WHERE id = ${user.id!}
			  RETURNING id, email, name, image, email_verified`
			return toAdapterUser(rows[0])
		},

		async deleteUser(userId) {
			await query`DELETE FROM users WHERE id = ${userId}`
		},

		async linkAccount(account) {
			await query`INSERT INTO accounts (
			    user_id, type, provider, provider_account_id,
			    refresh_token, access_token, expires_at,
			    token_type, scope, id_token, session_state
			  ) VALUES (
			    ${account.userId}, ${account.type}, ${account.provider}, ${account.providerAccountId},
			    ${account.refresh_token ?? null}, ${account.access_token ?? null}, ${account.expires_at ?? null},
			    ${account.token_type ?? null}, ${account.scope ?? null}, ${account.id_token ?? null}, ${account.session_state ?? null}
			  )
			  ON CONFLICT (provider, provider_account_id) DO NOTHING`
			return account as AdapterAccount
		},

		async unlinkAccount({ provider, providerAccountId }) {
			await query`DELETE FROM accounts
			  WHERE provider = ${provider}
			    AND provider_account_id = ${providerAccountId}`
		},

		async createVerificationToken(verificationToken) {
			const rows = await query<{
				identifier: string
				token: string
				expires: Date
			}>`INSERT INTO verification_tokens (identifier, token, expires)
			  VALUES (${verificationToken.identifier}, ${verificationToken.token}, ${verificationToken.expires})
			  RETURNING identifier, token, expires`
			return rows[0]
		},

		async useVerificationToken({ identifier, token }) {
			const rows = await query<{
				identifier: string
				token: string
				expires: Date
			}>`DELETE FROM verification_tokens
			  WHERE identifier = ${identifier} AND token = ${token}
			  RETURNING identifier, token, expires`
			return rows[0] ?? null
		},
	}
}
