import { NextRequest, NextResponse } from "next/server"
import { createRebrickableClient } from "@/rebrickable/client"
import { mapPart } from "@/rebrickable/mappers"
import { createLogger, createErrorResponse } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ setNum: string }> }) {
	const logger = createLogger(request)
	
	try {
		const { setNum } = await params

		if (!setNum) {
			logger.warn("Missing setNum parameter")
			return NextResponse.json({ ok: false, message: "Set number is required" }, { status: 400 })
		}

		logger.info("Fetching set parts from Rebrickable", { setNum })
		// Create client and fetch parts from Rebrickable
		const client = createRebrickableClient()
		const response = await client.getSetParts(setNum, 1, 1000) // Get all parts

		// Map to simplified DTOs
		const parts = response.results.map(mapPart)

		logger.logRequest(200, { setNum, partsCount: parts.length })
		// Return response with caching headers
		return NextResponse.json(
			{
				count: response.count,
				parts,
			},
			{
				status: 200,
				headers: {
					"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
				},
			}
		)
	} catch (error: any) {
		logger.error("Failed to fetch set parts", error)

		// Don't expose internal error details to client
		if (error instanceof Error && error.message.includes("REBRICKABLE_API_KEY")) {
			return NextResponse.json({ ok: false, message: "API configuration error", code: "CONFIG_ERROR" }, { status: 500 })
		}

		return NextResponse.json(
			createErrorResponse(error, "Failed to fetch set parts"),
			{ status: 500 }
		)
	}
}
