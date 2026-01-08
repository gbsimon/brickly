"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSet, useInventory, useProgress } from "@/lib/hooks/useDatabase"
import { updateSetLastOpened, saveInventory, initializeProgress, updateProgress, getProgress, syncProgressFromDB } from "@/db/queries"
import type { SetPart, SetMinifig } from "@/rebrickable/types"
import InventoryList from "@/components/InventoryList"
import styles from "./page.module.scss"

export default function SetDetailPage() {
	const params = useParams()
	const router = useRouter()
	const setNum = params?.setNum as string

	const { set, loading: setLoading } = useSet(setNum)
	const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0)
	const { inventory, loading: inventoryLoading } = useInventory(setNum, inventoryRefreshKey)
	const [progressRefreshKey, setProgressRefreshKey] = useState(0)
	const { progress, loading: progressLoading } = useProgress(setNum, progressRefreshKey)
	const [loadingParts, setLoadingParts] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const parts = inventory?.parts || []
	const isLoading = inventoryLoading || loadingParts || progressLoading

	// Update last opened timestamp when set is loaded
	useEffect(() => {
		if (set) {
			updateSetLastOpened(set.setNum)
		}
	}, [set])

	// Sync progress from database when set is loaded
	useEffect(() => {
		if (!setNum) return

		let mounted = true

		const syncProgress = async () => {
			try {
				await syncProgressFromDB(setNum)
				if (mounted) {
					// Trigger refresh after sync
					setProgressRefreshKey((prev) => prev + 1)
				}
			} catch (error) {
				console.error("Failed to sync progress from database:", error)
				// Continue with local cache if sync fails
			}
		}

		syncProgress()

		return () => {
			mounted = false
		}
	}, [setNum]) // Run when setNum changes

	// Fetch parts if inventory not cached
	useEffect(() => {
		const hasInventory = !!inventory && inventory.parts.length > 0
		const hasMinifigs = !!inventory && Array.isArray(inventory.minifigs)
		if (!setNum || (hasInventory && hasMinifigs) || loadingParts) return

		const fetchParts = async () => {
			setLoadingParts(true)
			setError(null)

			try {
				const response = await fetch(`/api/sets/${encodeURIComponent(setNum)}/parts`)

				if (!response.ok) {
					throw new Error("Failed to fetch parts")
				}

				const data = await response.json()
				const parts: SetPart[] = data.parts || []
				const minifigs: SetMinifig[] = data.minifigs || []

				// Save inventory to cache
				await saveInventory(setNum, parts, minifigs)

				// Trigger inventory refresh to update the UI
				setInventoryRefreshKey((prev) => prev + 1)

				// Initialize progress if it doesn't exist
				if (parts.length > 0) {
					const existingProgress = await getProgress(setNum, parts[0].partNum, parts[0].colorId, parts[0].isSpare)
					if (!existingProgress) {
						await initializeProgress(setNum, parts)
						setProgressRefreshKey((prev) => prev + 1)
					}
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load parts")
			} finally {
				setLoadingParts(false)
			}
		}

		fetchParts()
	}, [setNum, inventory, loadingParts])

	if (setLoading) {
		return (
			<div className={styles.centered}>
				<div className={styles.spinner}></div>
			</div>
		)
	}

	if (!set) {
		return (
			<div className={styles.notFound}>
				<div className={styles.notFoundInner}>
					<div className={styles.notFoundCard}>Set not found</div>
					<button onClick={() => router.push("/")} className={styles.notFoundButton}>
						Back to Library
					</button>
				</div>
			</div>
		)
	}

	// Calculate total parts count from inventory (sum of all quantities, excluding spares)
	// Rebrickable's total quantity excludes spare parts
	const totalPartsCount = parts.filter((part) => !part.isSpare).reduce((sum, part) => sum + part.quantity, 0)
	const uniquePartTypes = parts.filter((part) => !part.isSpare).length // Number of unique part+color combinations (excluding spares)

	return (
		<div className={`safe ${styles.page}`}>
			{/* Header */}
			<header className="toolbar">
				<div className={styles.headerInner}>
					<div className={styles.headerRow}>
						<button
							onClick={() => router.push("/")}
							className={`buttonGhost ${styles.backButton}`}
							aria-label="Back">
							<svg className={styles.backIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<img src="/brick.svg" alt="BrickByBrick" className={styles.brandIcon} />
						<div className={styles.titleWrap}>
							<h1 className="largeTitle truncate">{set.name}</h1>
							<p className={`subhead ${styles.meta}`}>
								#{set.setNum} • {totalPartsCount > 0 ? `${totalPartsCount} parts` : `${set.numParts} part types`}
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Content */}
			<main className={styles.main}>
				{error && <div className={styles.error}>{error}</div>}

				{isLoading && (
					<div className={styles.loading}>
						<div className={styles.spinner}></div>
					</div>
				)}

				{!isLoading && parts.length === 0 && !error && (
					<div className={styles.empty}>
						<p className={styles.emptyText}>No parts found for this set</p>
					</div>
				)}

				{!isLoading && parts.length > 0 && (
					<InventoryList
						setNum={setNum}
						parts={parts}
						minifigs={inventory?.minifigs || []}
						progress={progress}
						onProgressUpdate={() => setProgressRefreshKey((prev) => prev + 1)}
					/>
				)}
			</main>
		</div>
	)
}
