import { NextResponse } from "next/server"
import { query } from "@/lib/db/client"

export const runtime = "nodejs"

export async function GET() {
	try {
		// Fast, doesn't require any tables
		const result = await query<{ ok: number }>`select 1 as ok`
		return NextResponse.json({
			ok: true,
			result,
			expectedEnv: ["DATABASE_URL"],
			hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
			envHint: {
				DATABASE_URL_prefix: process.env.DATABASE_URL?.slice(0, 20),
			},
		})
	} catch (err: any) {
		console.error("DB_CHECK_ERROR", err)
		return NextResponse.json(
			{
				ok: false,
				name: err?.name,
				message: err?.message,
				code: err?.code,
				meta: err?.meta,
			},
			{ status: 500 }
		)
	}
}
