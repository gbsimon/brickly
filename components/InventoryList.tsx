"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { updateProgress, getProgressSummary } from "@/db/queries"
import type { SetPart } from "@/rebrickable/types"
import type { ProgressRecord } from "@/db/types"

/**
 * Performance optimizations:
 * - Heavy computations (filtering, sorting, grouping) are memoized with useMemo
 * - Images use lazy loading and sizes attribute for efficient loading
 * - Progress map is memoized to avoid recalculation
 * - Optimistic updates minimize re-renders
 * 
 * Note: Windowing/virtualization could be added for very large sets (5000+ parts)
 * using libraries like react-window or react-virtualized, but is not needed
 * for typical LEGO sets (100-2000 parts).
 */

interface InventoryListProps {
	setNum: string
	parts: SetPart[]
	progress: ProgressRecord[]
	onProgressUpdate?: () => void
}

export default function InventoryList({ setNum, parts, progress, onProgressUpdate }: InventoryListProps) {
	const t = useTranslations('inventory')
	const tCommon = useTranslations('common')
	
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

	const [viewMode, setViewMode] = useState<"list" | "grid" | "grouped">(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(viewModeKey)
			return (saved === "grid" ? "grid" : saved === "grouped" ? "grouped" : "list") as "list" | "grid" | "grouped"
		}
		return "list"
	})

	// Collapse state for grouped view
	const collapsedColorIdsKey = `collapsedColorIds-${setNum}`
	const [collapsedColorIds, setCollapsedColorIds] = useState<Set<number>>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(collapsedColorIdsKey)
			if (saved) {
				try {
					const parsed = JSON.parse(saved)
					return new Set(Array.isArray(parsed) ? parsed : [])
				} catch {
					return new Set<number>()
				}
			}
		}
		return new Set<number>()
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

	const [sortKey, setSortKey] = useState<"color" | "remaining" | "partNum" | "original">(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(sortKeyKey)
			return saved === "color" || saved === "remaining" || saved === "partNum" || saved === "original" ? saved : "partNum"
		}
		return "partNum"
	})

	const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(sortDirKey)
			return saved === "asc" || saved === "desc" ? saved : "asc"
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
			localStorage.setItem(collapsedColorIdsKey, JSON.stringify(Array.from(collapsedColorIds)))
		}
	}, [collapsedColorIds, collapsedColorIdsKey])

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

	// Create a map of original indices for Rebrickable order sorting
	const originalIndexMap = useMemo(() => {
		const map = new Map<string, number>()
		parts.forEach((part, index) => {
			const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
			// Store the minimum index (first occurrence) for each unique part
			if (!map.has(key)) {
				map.set(key, index)
			}
		})
		return map
	}, [parts])

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

			if (sortKey === "original") {
				// Sort by original Rebrickable order (ascending index)
				const indexA = originalIndexMap.get(keyA) ?? Infinity
				const indexB = originalIndexMap.get(keyB) ?? Infinity
				comparison = indexA - indexB
				// Sort direction doesn't apply to original order (always ascending)
			} else if (sortKey === "color") {
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

			// Apply sort direction (except for original order)
			if (sortKey === "original") {
				return comparison
			}
			return sortDir === "asc" ? comparison : -comparison
		})

		return filtered
	}, [parts, progressMap, hideCompleted, hideSpare, filterColorId, sortKey, sortDir, originalIndexMap])

	// Group parts by color for grouped view
	const groupedParts = useMemo(() => {
		if (viewMode !== "grouped") return []

		const groups = new Map<
			number,
			{
				colorId: number
				colorName: string
				items: typeof filteredParts
				groupNeededTotal: number
				groupFoundTotal: number
				groupRemainingTotal: number
			}
		>()

		filteredParts.forEach((part) => {
			const key = `${part.partNum}-${part.colorId}-${part.isSpare ? "spare" : "regular"}`
			const prog = progressMap.get(key)
			const found = prog?.foundQty || 0
			const needed = prog?.neededQty || part.quantity
			const remaining = Math.max(needed - found, 0)

			const existing = groups.get(part.colorId)
			if (existing) {
				existing.items.push(part)
				existing.groupNeededTotal += needed
				existing.groupFoundTotal += Math.min(found, needed)
				existing.groupRemainingTotal += remaining
			} else {
				groups.set(part.colorId, {
					colorId: part.colorId,
					colorName: part.colorName || `Color #${part.colorId}`,
					items: [part],
					groupNeededTotal: needed,
					groupFoundTotal: Math.min(found, needed),
					groupRemainingTotal: remaining,
				})
			}
		})

		// Convert to array and sort groups based on sortKey
		let groupsArray = Array.from(groups.values())

		if (sortKey === "color") {
			groupsArray.sort((a, b) => a.colorName.localeCompare(b.colorName))
		} else if (sortKey === "remaining") {
			groupsArray.sort((a, b) => {
				const comparison = b.groupRemainingTotal - a.groupRemainingTotal
				return comparison === 0 ? a.colorName.localeCompare(b.colorName) : comparison
			})
		} else if (sortKey === "partNum") {
			// Keep color order for partNum sort
			groupsArray.sort((a, b) => a.colorName.localeCompare(b.colorName))
		} else if (sortKey === "original") {
			// Keep color order for original sort
			groupsArray.sort((a, b) => a.colorName.localeCompare(b.colorName))
		}

		// Filter out empty groups if hideCompleted is enabled
		if (hideCompleted) {
			groupsArray = groupsArray.filter((group) => group.groupRemainingTotal > 0)
		}

		return groupsArray
	}, [filteredParts, progressMap, viewMode, sortKey, hideCompleted])

	// Toggle collapse for a color group
	const toggleCollapse = (colorId: number) => {
		setCollapsedColorIds((prev) => {
			const updated = new Set(prev)
			if (updated.has(colorId)) {
				updated.delete(colorId)
			} else {
				updated.add(colorId)
			}
			return updated
		})
	}

	// Expand all / Collapse all
	const expandAll = () => {
		setCollapsedColorIds(new Set<number>())
	}

	const collapseAll = () => {
		const allColorIds = new Set(groupedParts.map((group) => group.colorId))
		setCollapsedColorIds(allColorIds)
	}

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
			<div className="cardSolid mb-4 sm:mb-6 p-3 sm:p-4">
				<div className="flex flex-col gap-3 sm:gap-4">
					{/* Top row: Progress Tracker */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
						{/* Left side: Progress Tracker */}
						{filteredProgressSummary.totalParts > 0 ? (
							<div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
								<h3 className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Overall Progress</h3>
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
										{filteredProgressSummary.foundParts} / {filteredProgressSummary.totalParts}
									</span>
									<div className="flex-1 h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden min-w-0">
										<div className="h-full bg-blue-500 transition-all" style={{ width: `${filteredProgressSummary.completionPercentage}%` }} />
									</div>
									<span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">{filteredProgressSummary.completionPercentage}%</span>
								</div>
							</div>
						) : (
							<div className="flex-1">
								<h2 className="text-base sm:text-lg font-semibold text-gray-900">
									Inventory ({filteredParts.length} {filteredParts.length === 1 ? "part" : "parts"})
								</h2>
							</div>
						)}

						{/* Right side: View Mode Toggle and Hide Completed */}
						<div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
							{/* View Mode Toggle */}
							<div className="flex items-center gap-1 sm:gap-2 rounded-lg border border-gray-300 p-0.5 sm:p-1">
								<button onClick={() => setViewMode("list")} className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded text-xs sm:text-sm font-medium transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`} type="button" aria-label="List view">
									<svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
								<button onClick={() => setViewMode("grid")} className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded text-xs sm:text-sm font-medium transition-colors ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`} type="button" aria-label="Grid view">
									<svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</button>
								<button onClick={() => setViewMode("grouped")} className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded text-xs sm:text-sm font-medium transition-colors ${viewMode === "grouped" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`} type="button" aria-label="Grouped view">
									<svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
									</svg>
								</button>
							</div>
							{/* Hide Completed and Hide Spare Toggles */}
							<div className="flex flex-col gap-2">
								<label className="flex cursor-pointer items-center gap-1.5 sm:gap-2">
									<input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
									<span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">{t('hideCompleted')}</span>
								</label>
								<label className="flex cursor-pointer items-center gap-1.5 sm:gap-2">
									<input type="checkbox" checked={hideSpare} onChange={(e) => setHideSpare(e.target.checked)} className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
									<span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">{t('hideSpare')}</span>
								</label>
							</div>
						</div>
					</div>

					{/* Bottom row: Filter and Sort Controls */}
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
						{/* Color Filter */}
						<div className="flex items-center gap-2">
							<label htmlFor="colorFilter" className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
								{t('filter.color')}:
							</label>
							<select id="colorFilter" value={filterColorId === "all" ? "all" : filterColorId} onChange={(e) => setFilterColorId(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))} className="flex-1 sm:flex-none px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
								<option value="all">{t('filter.all')}</option>
								{availableColors.map((color) => (
									<option key={color.colorId} value={color.colorId}>
										{color.colorName} ({color.count})
									</option>
								))}
							</select>
						</div>

						{/* Sort Selector */}
						<div className="flex items-center gap-2">
							<label htmlFor="sortKey" className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
								{t('sort.by')}:
							</label>
							<select id="sortKey" value={sortKey} onChange={(e) => setSortKey(e.target.value as "color" | "remaining" | "partNum" | "original")} className="flex-1 sm:flex-none px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
								<option value="original">{t('sort.original')}</option>
								<option value="color">{t('sort.color')}</option>
								<option value="remaining">{t('sort.remaining')}</option>
								<option value="partNum">{t('sort.partNum')}</option>
							</select>
						</div>

						{/* Sort Direction Toggle */}
						<select id="sortDir" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} disabled={sortKey === "original"} className="px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" title={sortKey === "original" ? "Sort direction not available for Rebrickable order" : ""}>
							<option value="asc">{t('sort.asc')}</option>
							<option value="desc">{t('sort.desc')}</option>
						</select>
					</div>
				</div>
			</div>

			{/* Expand/Collapse All for Grouped View */}
			{viewMode === "grouped" && groupedParts.length > 0 && (
				<div className="mb-4 flex justify-end gap-2">
					<button onClick={expandAll} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="button">
						{tCommon('expand')}
					</button>
					<button onClick={collapseAll} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" type="button">
						{tCommon('collapse')}
					</button>
				</div>
			)}

			{/* Parts List/Grid/Grouped */}
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
											loading="lazy"
											sizes="64px"
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
			) : viewMode === "grid" ? (
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
											loading="lazy"
											sizes="(max-width: 640px) 50vw, 120px"
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
			) : viewMode === "grouped" ? (
				<div className="space-y-4">
					{groupedParts.map((group) => {
						const isCollapsed = collapsedColorIds.has(group.colorId)
						const hasItems = group.items.length > 0

						if (!hasItems) return null

						return (
							<div key={group.colorId} className="listSection">
								{/* Group Header */}
								<button onClick={() => toggleCollapse(group.colorId)} className="row w-full text-left hover:bg-gray-50 transition-colors" type="button" aria-expanded={!isCollapsed}>
									<div className="flex-1 flex items-center gap-3">
										<svg className={`h-5 w-5 text-gray-500 transition-transform ${isCollapsed ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
										<div className="flex-1">
											<h3 className="rowTitle">{group.colorName}</h3>
											<p className="rowMeta">
												{group.groupRemainingTotal} remaining / {group.groupNeededTotal} needed • {group.items.length} {group.items.length === 1 ? "part" : "parts"}
											</p>
										</div>
									</div>
								</button>

								{/* Group Items */}
								{!isCollapsed && (
									<>
										{group.items.map((part) => {
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
														<p className="rowMeta">Part #{part.partNum}</p>
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
									</>
								)}
							</div>
						)
					})}
				</div>
			) : null}

			{hideCompleted && filteredParts.length === 0 && (
				<div className="rounded-lg bg-green-50 p-8 text-center">
					<p className="text-green-800 font-medium">All parts completed! 🎉</p>
				</div>
			)}
		</div>
	)
}
