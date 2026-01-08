import { NextRequest, NextResponse } from "next/server"
import { createRebrickableClient } from "@/rebrickable/client"
import { mapPart, mapMinifig } from "@/rebrickable/mappers"
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

		logger.info("Fetching set parts and minifigs from Rebrickable", { setNum })
		// Create client and fetch parts and minifigs from Rebrickable
		const client = createRebrickableClient()
		
		// Fetch both parts and minifigs in parallel
		const [partsResponse, minifigsResponse] = await Promise.all([
			client.getSetParts(setNum, 1, 1000).catch(() => ({ results: [], count: 0 })),
			client.getSetMinifigs(setNum, 1, 1000).catch(() => ({ results: [], count: 0 })),
		])

		// Map to simplified DTOs
		const parts = Array.isArray(partsResponse?.results) ? partsResponse.results.map(mapPart) : []
		const minifigsRaw = Array.isArray(minifigsResponse?.results) ? minifigsResponse.results : []
		const minifigs = await Promise.all(
			minifigsRaw.map(async (minifig) => {
				const minifigSetNum = minifig.minifig?.set_num || minifig.set_num
				const hasName = !!minifig.minifig?.name
				const hasImage = !!minifig.minifig?.set_img_url
				if (hasName && hasImage) {
					return mapMinifig(minifig)
				}
				const detail = await client.getMinifig(minifigSetNum).catch(() => null)
				return mapMinifig(minifig, detail)
			})
		)

		const minifigPartsResponses = await Promise.all(
			minifigsRaw.map(async (minifig) => {
				const minifigSetNum = minifig.minifig?.set_num || minifig.set_num
				const quantityMultiplier = minifig.quantity || 1
				const response = await client
					.getMinifigParts(minifigSetNum, 1, 1000)
					.catch(() => ({ results: [], count: 0 }))
				return { quantityMultiplier, response }
			})
		)

		const minifigPartsMap = new Map<string, { part: ReturnType<typeof mapPart>; quantity: number }>()
		minifigPartsResponses.forEach(({ quantityMultiplier, response }) => {
			if (!Array.isArray(response?.results)) return
			response.results.forEach((part) => {
				const mapped = mapPart(part)
				const key = `${mapped.partNum}-${mapped.colorId}-${mapped.isSpare ? "spare" : "regular"}`
				const existing = minifigPartsMap.get(key)
				const addedQty = mapped.quantity * quantityMultiplier
				if (existing) {
					existing.quantity += addedQty
				} else {
					minifigPartsMap.set(key, { part: mapped, quantity: addedQty })
				}
			})
		})

		const partMap = new Map<string, ReturnType<typeof mapPart>>()
		const allItems = parts.map((part) => {
			const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
			partMap.set(key, part)
			return {
				...part,
				isMinifig: false,
			}
		})

		minifigPartsMap.forEach(({ part, quantity }, key) => {
			if (partMap.has(key)) return
			allItems.push({
				...part,
				quantity,
				isMinifig: true,
			})
		})

		logger.logRequest(200, { setNum, partsCount: parts.length, minifigsCount: minifigs.length, totalCount: allItems.length })
		// Return response with caching headers
		return NextResponse.json(
			{
				count: allItems.length,
				parts: allItems,
				minifigs,
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
