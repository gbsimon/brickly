import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/sets/[setNum]/progress/route"
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ensureUser } from "@/lib/db/users"
import { getUserProgress, saveProgressToDB, bulkSaveProgressToDB } from "@/lib/db/progress"
import { addSetToDB, getUserSet } from "@/lib/db/sets"
import { createRebrickableClient } from "@/rebrickable/client"
import { mockAuth } from "../../mocks/auth"

// Mock dependencies
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}))

vi.mock("@/lib/db/users", () => ({
	ensureUser: vi.fn(),
}))

vi.mock("@/lib/db/progress", () => ({
	getUserProgress: vi.fn(),
	saveProgressToDB: vi.fn(),
	bulkSaveProgressToDB: vi.fn(),
}))

vi.mock("@/lib/db/sets", () => ({
	addSetToDB: vi.fn(),
	getUserSet: vi.fn(),
}))

vi.mock("@/rebrickable/client", () => ({
	createRebrickableClient: vi.fn(),
}))

vi.mock("@/rebrickable/mappers", () => ({
	mapSetDetail: vi.fn((set) => ({
		setNum: set.set_num,
		name: set.name,
		year: set.year,
		numParts: set.num_parts,
		imageUrl: set.set_img_url,
		themeId: set.theme_id,
	})),
}))

describe("GET /api/sets/[setNum]/progress", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should get progress for a set", async () => {
		const mockUser = { id: "test-user-id" }
		const mockProgress = [
			{
				setNum: "21322-1",
				partNum: "3001",
				colorId: 1,
				isSpare: false,
				neededQty: 2,
				foundQty: 1,
				updatedAt: new Date("2024-01-01"),
			},
		]

		vi.mocked(auth).mockResolvedValue(mockAuth as any)
		vi.mocked(ensureUser).mockResolvedValue(mockUser as any)
		vi.mocked(getUserProgress).mockResolvedValue(mockProgress as any)

		const request = new NextRequest("http://localhost/api/sets/21322-1/progress")
		const params = Promise.resolve({ setNum: "21322-1" })

		const response = await GET(request, { params })
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.progress).toHaveLength(1)
		expect(getUserProgress).toHaveBeenCalledWith(mockUser.id, "21322-1")
	})

	it("should return 401 for unauthorized requests", async () => {
		vi.mocked(auth).mockResolvedValue(null as any)

		const request = new NextRequest("http://localhost/api/sets/21322-1/progress")
		const params = Promise.resolve({ setNum: "21322-1" })

		const response = await GET(request, { params })
		const data = await response.json()

		expect(response.status).toBe(401)
		expect(data.ok).toBe(false)
		expect(data.message).toBe("Unauthorized")
	})

	it("should return 400 for missing setNum", async () => {
		vi.mocked(auth).mockResolvedValue(mockAuth as any)

		const request = new NextRequest("http://localhost/api/sets//progress")
		const params = Promise.resolve({ setNum: "" })

		const response = await GET(request, { params })
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.ok).toBe(false)
		expect(data.message).toBe("Set number is required")
	})
})

describe("POST /api/sets/[setNum]/progress", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should save single progress item", async () => {
		const mockUser = { id: "test-user-id" }
		const progressData = {
			partNum: "3001",
			colorId: 1,
			isSpare: false,
			neededQty: 2,
			foundQty: 1,
		}

		vi.mocked(auth).mockResolvedValue(mockAuth as any)
		vi.mocked(ensureUser).mockResolvedValue(mockUser as any)
		vi.mocked(getUserSet).mockResolvedValue({ setNum: "21322-1" } as any)
		vi.mocked(saveProgressToDB).mockResolvedValue(undefined)

		const request = new NextRequest("http://localhost/api/sets/21322-1/progress", {
			method: "POST",
			body: JSON.stringify(progressData),
		})
		const params = Promise.resolve({ setNum: "21322-1" })

		const response = await POST(request, { params })
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.success).toBe(true)
		expect(saveProgressToDB).toHaveBeenCalled()
	})

	it("should save bulk progress items", async () => {
		const mockUser = { id: "test-user-id" }
		const progressArray = [
			{
				partNum: "3001",
				colorId: 1,
				isSpare: false,
				neededQty: 2,
				foundQty: 1,
			},
			{
				partNum: "3002",
				colorId: 2,
				isSpare: false,
				neededQty: 1,
				foundQty: 0,
			},
		]

		vi.mocked(auth).mockResolvedValue(mockAuth as any)
		vi.mocked(ensureUser).mockResolvedValue(mockUser as any)
		vi.mocked(getUserSet).mockResolvedValue({ setNum: "21322-1" } as any)
		vi.mocked(bulkSaveProgressToDB).mockResolvedValue(undefined)

		const request = new NextRequest("http://localhost/api/sets/21322-1/progress", {
			method: "POST",
			body: JSON.stringify(progressArray),
		})
		const params = Promise.resolve({ setNum: "21322-1" })

		const response = await POST(request, { params })
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.success).toBe(true)
		expect(bulkSaveProgressToDB).toHaveBeenCalledWith(
			mockUser.id,
			expect.arrayContaining(
				progressArray.map((item) =>
					expect.objectContaining({
						...item,
						setNum: "21322-1",
					})
				)
			)
		)
	})

	it("should return 400 for invalid progress data", async () => {
		const mockUser = { id: "test-user-id" }
		const invalidProgress = {
			// missing required fields
			partNum: "3001",
		}

		vi.mocked(auth).mockResolvedValue(mockAuth as any)
		vi.mocked(ensureUser).mockResolvedValue(mockUser as any)

		const request = new NextRequest("http://localhost/api/sets/21322-1/progress", {
			method: "POST",
			body: JSON.stringify(invalidProgress),
		})
		const params = Promise.resolve({ setNum: "21322-1" })

		const response = await POST(request, { params })
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.ok).toBe(false)
		expect(data.message).toContain("Missing required fields")
		expect(data.code).toBe("VALIDATION_ERROR")
	})

	it("should return 401 for unauthorized requests", async () => {
		vi.mocked(auth).mockResolvedValue(null as any)

		const request = new NextRequest("http://localhost/api/sets/21322-1/progress", {
			method: "POST",
			body: JSON.stringify({
				partNum: "3001",
				colorId: 1,
				neededQty: 2,
				foundQty: 1,
			}),
		})
		const params = Promise.resolve({ setNum: "21322-1" })

		const response = await POST(request, { params })
		const data = await response.json()

		expect(response.status).toBe(401)
		expect(data.ok).toBe(false)
		expect(data.message).toBe("Unauthorized")
	})
})
