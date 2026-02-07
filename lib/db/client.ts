import postgres, { type Sql } from "postgres"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
	throw new Error("DATABASE_URL is required for Postgres connections.")
}

function createClient(): Sql {
	return postgres(databaseUrl as string, {
		ssl: "require",
		max: 10,
		idle_timeout: 20,
		connect_timeout: 10,
	})
}

const globalForDb = globalThis as unknown as {
	db: Sql | undefined
}

export const db: Sql = globalForDb.db ?? createClient()

if (process.env.NODE_ENV !== "production") globalForDb.db = db

export function query<T>(
	strings: TemplateStringsArray,
	...values: unknown[]
): Promise<T[]> {
	const raw = db as unknown as (
		template: TemplateStringsArray,
		...params: unknown[]
	) => Promise<T[]>
	return raw(strings, ...values)
}
