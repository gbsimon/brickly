"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { updateProgress, getProgressSummary } from "@/db/queries"
import type { SetPart } from "@/rebrickable/types"
import type { ProgressRecord } from "@/db/types"

interface InventoryListProps {
	setNum: string
	parts: SetPart[]
	progress: ProgressRecord[]
	onProgressUpdate?: () => void
}

export default function InventoryList({ setNum, parts, progress, onProgressUpdate }: InventoryListProps) {
	// Use localStorage key specific to this set to persist preferences
	const hideCompletedKey = `hideCompleted-${setNum}`
	const hideSpareKey = `hideSpare-${setNum}`
	const viewModeKey = `viewMode-${setNum}`
	const filterColorKey = `filterColor-${setNum}`
	const sortKeyKey = `sortKey-${setNum}`
	const sortDirKey = `sortDir-${setNum}`

	const [hideCompleted, setHideCompleted] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(hideCompletedKey)
			return saved === "true"
		}
		return false
	})

	const [hideSpare, setHideSpare] = useState(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(hideSpareKey)
			return saved === "true"
		}
		return false
	})

	const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(viewModeKey)
			return (saved === "grid" ? "grid" : "list") as "list" | "grid"
		}
		return "list"
	})

	// Filter and sort state
	const [filterColorId, setFilterColorId] = useState<number | "all">(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(filterColorKey)
			if (saved === "all" || saved === null) return "all"
			const parsed = parseInt(saved, 10)
			return isNaN(parsed) ? "all" : parsed
		}
		return "all"
	})

	const [sortKey, setSortKey] = useState<"color" | "remaining" | "partNum">(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(sortKeyKey)
			return (saved === "color" || saved === "remaining" || saved === "partNum") ? saved : "partNum"
		}
		return "partNum"
	})

	const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(sortDirKey)
			return (saved === "asc" || saved === "desc") ? saved : "asc"
		}
		return "asc"
	})

	// Local optimistic progress state - updates immediately without re-fetching
	const [localProgress, setLocalProgress] = useState<Map<string, ProgressRecord>>(new Map())
	const progressInitialized = useRef(false)

	const [progressSummary, setProgressSummary] = useState<{
		totalParts: number
		foundParts: number
		completionPercentage: number
	} | null>(null)

	// Save to localStorage when preferences change
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(hideCompletedKey, hideCompleted.toString())
		}
	}, [hideCompleted, hideCompletedKey])

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(hideSpareKey, hideSpare.toString())
		}
	}, [hideSpare, hideSpareKey])

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(viewModeKey, viewMode)
		}
	}, [viewMode, viewModeKey])

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(filterColorKey, filterColorId === "all" ? "all" : filterColorId.toString())
		}
	}, [filterColorId, filterColorKey])

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(sortKeyKey, sortKey)
		}
	}, [sortKey, sortKeyKey])

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(sortDirKey, sortDir)
		}
	}, [sortDir, sortDirKey])

	// Initialize local progress from props (only once or when progress prop changes significantly)
	useEffect(() => {
		if (!progressInitialized.current || progress.length > 0) {
			const newMap = new Map<string, ProgressRecord>()
			progress.forEach((p) => {
				const isSpare = p.id.endsWith("-spare")
				const key = `${p.partNum}-${p.colorId}-${isSpare ? "spare" : "regular"}`
				newMap.set(key, p)
			})
			setLocalProgress(newMap)
			progressInitialized.current = true
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [setNum]) // Only re-initialize when setNum changes

	// Merge local optimistic updates with prop updates (for syncing from DB)
	useEffect(() => {
		if (progress.length > 0) {
			setLocalProgress((prev) => {
				const updated = new Map(prev)
				progress.forEach((p) => {
					const isSpare = p.id.endsWith("-spare")
					const key = `${p.partNum}-${p.colorId}-${isSpare ? "spare" : "regular"}`
					// Only update if we don't have a more recent local update
					const existing = updated.get(key)
					if (!existing || p.updatedAt >= existing.updatedAt) {
						updated.set(key, p)
					}
				})
				return updated
			})
		}
	}, [progress])

	// Load progress summary
	useEffect(() => {
		getProgressSummary(setNum)
			.then((summary) => {
				setProgressSummary(summary)
			})
			.catch(() => {
				setProgressSummary(null)
			})
	}, [setNum, localProgress]) // Use localProgress instead of progress prop

	// Create a map of progress for quick lookup (uses local optimistic state)
	// Key includes isSpare to differentiate spares from regular parts
	const progressMap = useMemo(() => {
		return localProgress
	}, [localProgress])

	const handleIncrement = async (part: SetPart, e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault()
		e.stopPropagation()

		const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
		const currentProgress = progressMap.get(key)
		const currentFound = currentProgress?.foundQty || 0
		const newFound = currentFound + 1
		const neededQty = currentProgress?.neededQty || part.quantity

		// Optimistically update local state immediately (no re-render from parent)
		setLocalProgress((prev) => {
			const updated = new Map(prev)
			updated.set(key, {
				id: currentProgress?.id || `${setNum}-${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`,
				setNum,
				partNum: part.partNum,
				colorId: part.colorId,
				neededQty,
				foundQty: newFound,
				updatedAt: Date.now(),
			})
			return updated
		})

		// Update IndexedDB and sync to DB in the background (non-blocking)
		updateProgress(setNum, part.partNum, part.colorId, newFound, part.isSpare).catch((error) => {
			console.error("Failed to sync progress:", error)
			// On error, revert optimistic update
			setLocalProgress((prev) => {
				const updated = new Map(prev)
				if (currentProgress) {
					updated.set(key, currentProgress)
				} else {
					updated.delete(key)
				}
				return updated
			})
		})
	}

	const handleDecrement = async (part: SetPart, e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault()
		e.stopPropagation()

		const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
		const currentProgress = progressMap.get(key)
		const currentFound = currentProgress?.foundQty || 0
		const newFound = Math.max(0, currentFound - 1)
		const neededQty = currentProgress?.neededQty || part.quantity

		// Optimistically update local state immediately (no re-render from parent)
		setLocalProgress((prev) => {
			const updated = new Map(prev)
			updated.set(key, {
				id: currentProgress?.id || `${setNum}-${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`,
				setNum,
				partNum: part.partNum,
				colorId: part.colorId,
				neededQty,
				foundQty: newFound,
				updatedAt: Date.now(),
			})
			return updated
		})

		// Update IndexedDB and sync to DB in the background (non-blocking)
		updateProgress(setNum, part.partNum, part.colorId, newFound, part.isSpare).catch((error) => {
			console.error("Failed to sync progress:", error)
			// On error, revert optimistic update
			setLocalProgress((prev) => {
				const updated = new Map(prev)
				if (currentProgress) {
					updated.set(key, currentProgress)
				} else {
					updated.delete(key)
				}
				return updated
			})
		})
	}

	// Get unique colors from parts for filter dropdown
	const availableColors = useMemo(() => {
		const colorMap = new Map<number, { colorId: number; colorName: string; count: number }>()
		
		parts.forEach((part) => {
			if (hideSpare && part.isSpare) return
			
			const existing = colorMap.get(part.colorId)
			if (existing) {
				existing.count += 1
			} else {
				colorMap.set(part.colorId, {
					colorId: part.colorId,
					colorName: part.colorName || `Color #${part.colorId}`,
					count: 1,
				})
			}
		})
		
		return Array.from(colorMap.values()).sort((a, b) => a.colorName.localeCompare(b.colorName))
	}, [parts, hideSpare])

	// Filter and sort parts
	const filteredParts = useMemo(() => {
		let filtered = parts

		// Step 1: Filter out spares if hideSpare is enabled
		if (hideSpare) {
			filtered = filtered.filter((part) => !part.isSpare)
		}

		// Step 2: Filter out completed if hideCompleted is enabled (applied before color filter/sort)
		if (hideCompleted) {
			filtered = filtered.filter((part) => {
				const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
				const prog = progressMap.get(key)
				const found = prog?.foundQty || 0
				return found < part.quantity
			})
		}

		// Step 3: Filter by color
		if (filterColorId !== "all") {
			filtered = filtered.filter((part) => part.colorId === filterColorId)
		}

		// Step 4: Sort
		filtered = [...filtered].sort((a, b) => {
			const keyA = `${a.partNum}-${a.colorId}-${a.isSpare ? "spare" : "regular"}`
			const keyB = `${b.partNum}-${b.colorId}-${b.isSpare ? "spare" : "regular"}`
			const progA = progressMap.get(keyA)
			const progB = progressMap.get(keyB)
			const foundA = progA?.foundQty || 0
			const foundB = progB?.foundQty || 0
			const neededA = progA?.neededQty || a.quantity
			const neededB = progB?.neededQty || b.quantity
			const remainingA = Math.max(neededA - foundA, 0)
			const remainingB = Math.max(neededB - foundB, 0)

			let comparison = 0

			if (sortKey === "color") {
				// Primary: colorName (or colorId if name missing)
				const colorA = a.colorName || `Color #${a.colorId}`
				const colorB = b.colorName || `Color #${b.colorId}`
				comparison = colorA.localeCompare(colorB)
				// Secondary: partNum
				if (comparison === 0) {
					comparison = a.partNum.localeCompare(b.partNum)
				}
			} else if (sortKey === "remaining") {
				// Primary: remaining (desc by default)
				comparison = remainingB - remainingA
				// Secondary: colorName
				if (comparison === 0) {
					const colorA = a.colorName || `Color #${a.colorId}`
					const colorB = b.colorName || `Color #${b.colorId}`
					comparison = colorA.localeCompare(colorB)
				}
				// Tertiary: partNum
				if (comparison === 0) {
					comparison = a.partNum.localeCompare(b.partNum)
				}
			} else if (sortKey === "partNum") {
				// Primary: partNum
				comparison = a.partNum.localeCompare(b.partNum)
				// Secondary: colorName
				if (comparison === 0) {
					const colorA = a.colorName || `Color #${a.colorId}`
					const colorB = b.colorName || `Color #${b.colorId}`
					comparison = colorA.localeCompare(colorB)
				}
			}

			// Apply sort direction
			return sortDir === "asc" ? comparison : -comparison
		})

		return filtered
	}, [parts, progressMap, hideCompleted, hideSpare, filterColorId, sortKey, sortDir])

	// Calculate progress summary based on visible parts (respects hideSpare, but NOT hideCompleted)
	// Hide completed only affects the list display, not the progress calculation
	const filteredProgressSummary = useMemo(() => {
		let totalParts = 0
		let foundParts = 0

		// Filter parts for progress calculation (only exclude spares if hideSpare is enabled)
		const partsForProgress = hideSpare ? parts.filter((part) => !part.isSpare) : parts

		partsForProgress.forEach((part) => {
			const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
			const prog = progressMap.get(key)
			totalParts += part.quantity
			foundParts += Math.min(prog?.foundQty || 0, part.quantity)
		})

		const completionPercentage = totalParts > 0 ? Math.round((foundParts / totalParts) * 100) : 0

		return {
			totalParts,
			foundParts,
			completionPercentage,
		}
	}, [parts, progressMap, hideSpare])

	return (
		<div>
			{/* Progress Tracker and Controls */}
			<div className="cardSolid mb-6 p-4">
				<div className="flex flex-col gap-4">
					{/* Top row: Progress Tracker */}
					<div className="flex items-center justify-between gap-4">
						{/* Left side: Progress Tracker */}
						{filteredProgressSummary.totalParts > 0 ? (
							<div className="flex-1 flex items-center gap-3">
								<h3 className="text-sm font-medium text-gray-700 whitespace-nowrap">Overall Progress</h3>
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
										{filteredProgressSummary.foundParts} / {filteredProgressSummary.totalParts}
									</span>
									<div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden min-w-0">
										<div className="h-full bg-blue-500 transition-all" style={{ width: `${filteredProgressSummary.completionPercentage}%` }} />
									</div>
									<span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">{filteredProgressSummary.completionPercentage}%</span>
								</div>
							</div>
						) : (
							<div className="flex-1">
								<h2 className="text-lg font-semibold text-gray-900">
									Inventory ({filteredParts.length} {filteredParts.length === 1 ? "part" : "parts"})
								</h2>
							</div>
						)}

						{/* Right side: View Mode Toggle and Hide Completed */}
						<div className="flex items-center gap-4 flex-shrink-0">
							{/* View Mode Toggle */}
							<div className="flex items-center gap-2 rounded-lg border border-gray-300 p-1">
								<button onClick={() => setViewMode("list")} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`} type="button" aria-label="List view">
									<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
								<button onClick={() => setViewMode("grid")} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`} type="button" aria-label="Grid view">
									<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</button>
							</div>
							{/* Hide Completed and Hide Spare Toggles */}
							<div className="flex flex-col gap-2">
								<label className="flex cursor-pointer items-center gap-2">
									<input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
									<span className="text-sm text-gray-700 whitespace-nowrap">Hide completed</span>
								</label>
								<label className="flex cursor-pointer items-center gap-2">
									<input type="checkbox" checked={hideSpare} onChange={(e) => setHideSpare(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
									<span className="text-sm text-gray-700 whitespace-nowrap">Hide spare</span>
								</label>
							</div>
						</div>
					</div>

					{/* Bottom row: Filter and Sort Controls */}
					<div className="flex items-center gap-4 flex-wrap">
						{/* Color Filter */}
						<div className="flex items-center gap-2">
							<label htmlFor="colorFilter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
								Color:
							</label>
							<select
								id="colorFilter"
								value={filterColorId === "all" ? "all" : filterColorId}
								onChange={(e) => setFilterColorId(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
								className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="all">All colors</option>
								{availableColors.map((color) => (
									<option key={color.colorId} value={color.colorId}>
										{color.colorName} ({color.count})
									</option>
								))}
							</select>
						</div>

						{/* Sort Selector */}
						<div className="flex items-center gap-2">
							<label htmlFor="sortKey" className="text-sm font-medium text-gray-700 whitespace-nowrap">
								Sort by:
							</label>
							<select
								id="sortKey"
								value={sortKey}
								onChange={(e) => setSortKey(e.target.value as "color" | "remaining" | "partNum")}
								className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="color">Color</option>
								<option value="remaining">Remaining</option>
								<option value="partNum">Part #</option>
							</select>
						</div>

						{/* Sort Direction Toggle */}
						<button
							onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
							className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1"
							type="button"
							aria-label={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
						>
							{sortDir === "asc" ? (
								<>
									<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
									</svg>
									<span>Asc</span>
								</>
							) : (
								<>
									<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
									<span>Desc</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Parts List/Grid */}
			{viewMode === "list" ? (
				<div className="listSection">
					{filteredParts.map((part, index) => {
						const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
						const prog = progressMap.get(key)
						const found = prog?.foundQty || 0
						const needed = part.quantity
						const isComplete = found >= needed

						return (
							<div key={key} className={`row ${isComplete && !hideCompleted ? "bg-green-100" : ""}`}>
								{/* Part Image */}
								<div className="flex-shrink-0">
									{part.imageUrl ? (
										<img
											src={part.imageUrl}
											alt={part.partName}
											className="h-16 w-16 rounded object-contain bg-gray-100 mix-blend-multiply"
											style={{ mixBlendMode: "multiply" }}
											onError={(e) => {
												e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23e5e7eb"/%3E%3C/svg%3E'
											}}
										/>
									) : (
										<div className="flex h-16 w-16 items-center justify-center rounded bg-gray-200 text-gray-400">
											<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
											</svg>
										</div>
									)}
								</div>

								{/* Part Info */}
								<div className="flex-1 min-w-0">
									<h3 className="rowTitle truncate">{part.partName || part.partNum}</h3>
									<p className="rowMeta">
										{part.colorName} • Part #{part.partNum}
									</p>
									{part.isSpare && <span className="mt-1 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Spare</span>}
								</div>

								{/* Counter */}
								<div className="stepper">
									<span className="rowMeta">
										{found} / {needed}
									</span>
									<button onClick={(e) => handleDecrement(part, e)} disabled={found === 0} className="stepperBtn" aria-label="Decrease" type="button">
										<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
										</svg>
									</button>
									<span className="stepperValue">{found}</span>
									<button onClick={(e) => handleIncrement(part, e)} disabled={found >= needed} className="stepperBtn" aria-label="Increase" type="button">
										<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
										</svg>
									</button>
								</div>
							</div>
						)
					})}
				</div>
			) : (
				<div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(120px, 100%), 1fr))" }}>
					{filteredParts.map((part) => {
						const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
						const prog = progressMap.get(key)
						const found = prog?.foundQty || 0
						const needed = part.quantity
						const isComplete = found >= needed

						return (
							<div key={key} className={`cardSolid flex flex-col items-center p-2 ${isComplete && !hideCompleted ? "bg-green-100" : ""}`}>
								{/* Part Image */}
								<div className="w-full aspect-square mb-2 flex items-center justify-center rounded">
									{part.imageUrl ? (
										<img
											src={part.imageUrl}
											alt={part.partName}
											className="w-full h-full object-contain mix-blend-multiply"
											style={{ mixBlendMode: "multiply" }}
											onError={(e) => {
												e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23e5e7eb"/%3E%3C/svg%3E'
											}}
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center text-gray-400">
											<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
											</svg>
										</div>
									)}
								</div>

								{/* Counter */}
								<div className="w-full flex items-stretch justify-center gap-0 rounded-lg border border-gray-300 overflow-hidden">
									<button onClick={(e) => handleDecrement(part, e)} disabled={found === 0} className="flex-shrink-0 px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center" aria-label="Decrease" type="button">
										<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
										</svg>
									</button>
									<span className="px-2 py-1 text-xs font-medium whitespace-nowrap text-center flex items-center justify-center" style={{ color: "var(--text)" }}>
										{found} / {needed}
									</span>
									<button onClick={(e) => handleIncrement(part, e)} disabled={found >= needed} className="flex-shrink-0 px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center" aria-label="Increase" type="button">
										<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
										</svg>
									</button>
								</div>
							</div>
						)
					})}
				</div>
			)}

			{hideCompleted && filteredParts.length === 0 && (
				<div className="rounded-lg bg-green-50 p-8 text-center">
					<p className="text-green-800 font-medium">All parts completed! 🎉</p>
				</div>
			)}
		</div>
	)
}
