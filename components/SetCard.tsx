"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { removeSet, getProgressSummary, toggleSetOngoing, toggleSetHidden } from "@/db/queries"
import type { SetRecord } from "@/db/types"
import styles from "./SetCard.module.scss"

interface SetCardProps {
	set: SetRecord
	onRemove?: () => void
	onOngoingToggle?: () => void
	onHiddenToggle?: () => void
}

export default function SetCard({ set, onRemove, onOngoingToggle, onHiddenToggle }: SetCardProps) {
	const router = useRouter()
	const params = useParams()
	const locale = (params?.locale as string) || "en"
	const t = useTranslations("library")
	const tCommon = useTranslations("common")
	const [showConfirm, setShowConfirm] = useState(false)
	const [isOngoing, setIsOngoing] = useState(set.isOngoing)
	const [isHidden, setIsHidden] = useState(set.isHidden)
	const [progressSummary, setProgressSummary] = useState<{
		totalParts: number
		foundParts: number
		completionPercentage: number
	} | null>(null)

	// Update local state when set prop changes
	useEffect(() => {
		setIsOngoing(set.isOngoing)
	}, [set.isOngoing])

	useEffect(() => {
		setIsHidden(set.isHidden)
	}, [set.isHidden])

	// Load progress summary
	useEffect(() => {
		getProgressSummary(set.setNum)
			.then((summary) => {
				setProgressSummary(summary)
			})
			.catch(() => {
				// If no progress exists, that's fine - just don't show summary
				setProgressSummary(null)
			})
	}, [set.setNum])

	const handleClick = (e: React.MouseEvent) => {
		// Don't navigate if clicking action buttons
		if ((e.target as HTMLElement).closest(".remove-button") || (e.target as HTMLElement).closest(".ongoing-button") || (e.target as HTMLElement).closest(".hidden-button")) {
			return
		}
		router.push(`/${locale}/sets/${set.setNum}`)
	}

	const handleOngoingToggle = async (e: React.MouseEvent) => {
		e.stopPropagation()
		const newOngoingStatus = !isOngoing
		setIsOngoing(newOngoingStatus)
		try {
			await toggleSetOngoing(set.setNum, newOngoingStatus)
			onOngoingToggle?.()
		} catch (error) {
			console.error("Failed to toggle ongoing status:", error)
			// Revert on error
			setIsOngoing(!newOngoingStatus)
			alert("Failed to update ongoing status. Please try again.")
		}
	}

	const handleHiddenToggle = async (e: React.MouseEvent) => {
		e.stopPropagation()
		const newHiddenStatus = !isHidden
		setIsHidden(newHiddenStatus)
		try {
			await toggleSetHidden(set.setNum, newHiddenStatus)
			onHiddenToggle?.()
		} catch (error) {
			console.error("Failed to toggle hidden status:", error)
			setIsHidden(!newHiddenStatus)
		}
	}

	const handleRemoveClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		setShowConfirm(true)
	}

	const handleConfirmRemove = async (e: React.MouseEvent) => {
		e.stopPropagation()
		try {
			await removeSet(set.setNum)
			onRemove?.()
		} catch (error) {
			console.error("Failed to remove set:", error)
			alert("Failed to remove set. Please try again.")
		}
	}

	const handleCancelRemove = (e: React.MouseEvent) => {
		e.stopPropagation()
		setShowConfirm(false)
	}

	return (
		<div className={`cardSolid ${styles.card}`}>
			<button onClick={handleClick} className={styles.cardButton}>
				{set.imageUrl && (
					<div className={styles.imageWrap}>
						<img
							src={set.imageUrl}
							alt={set.name}
							className={styles.image}
							onError={(e) => {
								e.currentTarget.style.display = "none"
							}}
						/>
						{/* Progress overlay */}
						{progressSummary && progressSummary.totalParts > 0 && (
							<div className={styles.overlay}>
								<div className={styles.overlayRow}>
									<span>{progressSummary.completionPercentage}%</span>
									<div className={styles.overlayBar}>
										<div className={styles.overlayFill} style={{ width: `${progressSummary.completionPercentage}%` }} />
									</div>
									<span>
										{progressSummary.foundParts} / {progressSummary.totalParts}
									</span>
								</div>
							</div>
						)}
					</div>
				)}
				<div className={styles.body}>
					<h3 className="rowTitle line-clamp-2">{set.name}</h3>
					<p className={`rowMeta ${styles.meta}`}>
						#{set.setNum} • {set.numParts} {t("parts")}
					</p>
					{set.year && (
						<p className={`rowMeta ${styles.meta}`}>
							{set.year}
							{set.themeName && ` • ${set.themeName}`}
						</p>
					)}

					{/* Progress summary (if no image) */}
					{!set.imageUrl && progressSummary && progressSummary.totalParts > 0 && (
						<div className={styles.progressBlock}>
							<div className={styles.progressRow}>
								<span className={styles.progressLabel}>{t("progress")}</span>
								<span className={styles.progressValue}>{progressSummary.completionPercentage}%</span>
							</div>
							<div className={styles.progressBar}>
								<div className={styles.overlayFill} style={{ width: `${progressSummary.completionPercentage}%` }} />
							</div>
							<p className={styles.progressNote}>
								{progressSummary.foundParts} / {progressSummary.totalParts} {t("parts")} {t("found")}
							</p>
						</div>
					)}
				</div>
			</button>

			{/* Ongoing toggle button */}
			<button
				onClick={handleOngoingToggle}
				className={`ongoing-button ${styles.floatingButton} ${styles.ongoingButton} ${
					isOngoing ? styles.ongoingActive : styles.ongoingInactive
				}`}
				aria-label={isOngoing ? "Mark as not ongoing" : "Mark as ongoing"}
				type="button"
			>
				{isOngoing ? (
					<svg className={styles.icon} fill="currentColor" viewBox="0 0 20 20">
						<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
					</svg>
				) : (
					<svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-1.783-1.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
					</svg>
				)}
			</button>

			{/* Hidden toggle button */}
			<button
				onClick={handleHiddenToggle}
				className={`hidden-button ${styles.floatingButton} ${styles.hiddenButton} ${
					isHidden ? styles.hiddenActive : styles.hiddenInactive
				}`}
				aria-label={isHidden ? "Unhide set" : "Hide set"}
				type="button"
			>
				{isHidden ? (
					<svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
					</svg>
				) : (
					<svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
					</svg>
				)}
			</button>

			{/* Remove button - always visible for iPad (no hover) */}
			<button
				onClick={handleRemoveClick}
				className={`remove-button ${styles.floatingButton} ${styles.removeButton}`}
				aria-label="Remove set"
				type="button"
			>
				<svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>

			{/* Confirmation dialog */}
			{showConfirm && (
				<div className={styles.confirmBackdrop}>
					<div className={styles.confirmModal}>
						<h3 className={styles.confirmTitle}>
							{tCommon("delete")} {t("title")}?
						</h3>
						<p className={styles.confirmText}>{t("removeConfirm", { name: set.name })}</p>
						<div className={styles.confirmActions}>
							<button
								onClick={handleCancelRemove}
								className={`${styles.confirmButton} ${styles.confirmCancel}`}
								type="button"
							>
								{tCommon("cancel")}
							</button>
							<button
								onClick={handleConfirmRemove}
								className={`${styles.confirmButton} ${styles.confirmDelete}`}
								type="button"
							>
								{tCommon("delete")}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
