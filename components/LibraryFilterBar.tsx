"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import styles from "./LibraryFilterBar.module.scss"

export type SortKey = "lastOpened" | "name" | "parts"
export type SortDir = "asc" | "desc"

interface LibraryFilterBarProps {
	searchQuery: string
	onSearchChange: (query: string) => void
	sortKey: SortKey
	onSortKeyChange: (key: SortKey) => void
	sortDir: SortDir
	onSortDirChange: (dir: SortDir) => void
	filterOngoing: boolean
	onFilterOngoingChange: (value: boolean) => void
	filterCompleted: boolean
	onFilterCompletedChange: (value: boolean) => void
	filterThemeId: number | "all"
	onFilterThemeIdChange: (themeId: number | "all") => void
	availableThemes: Array<{ themeId: number; themeName: string }>
	hasProgress: boolean // Whether any sets have progress data
	storageKey?: string // For persisting state
	onClear?: () => void // Optional clear handler
}

export default function LibraryFilterBar({
	searchQuery,
	onSearchChange,
	sortKey,
	onSortKeyChange,
	sortDir,
	onSortDirChange,
	filterOngoing,
	onFilterOngoingChange,
	filterCompleted,
	onFilterCompletedChange,
	filterThemeId,
	onFilterThemeIdChange,
	availableThemes,
	hasProgress,
	storageKey = "library-filters",
	onClear,
}: LibraryFilterBarProps) {
	const t = useTranslations("library")
	const tCommon = useTranslations("common")

	// Load persisted state from localStorage
	useEffect(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(storageKey)
			if (saved) {
				try {
					const parsed = JSON.parse(saved)
					if (parsed.searchQuery) onSearchChange(parsed.searchQuery)
					if (parsed.sortKey) onSortKeyChange(parsed.sortKey)
					if (parsed.sortDir) onSortDirChange(parsed.sortDir)
					if (typeof parsed.filterOngoing === "boolean") onFilterOngoingChange(parsed.filterOngoing)
					if (typeof parsed.filterCompleted === "boolean") onFilterCompletedChange(parsed.filterCompleted)
					if (parsed.filterThemeId) onFilterThemeIdChange(parsed.filterThemeId)
				} catch (e) {
					// Invalid saved data, ignore
				}
			}
		}
	}, []) // Only run on mount

	// Persist state to localStorage
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(
				storageKey,
				JSON.stringify({
					searchQuery,
					sortKey,
					sortDir,
					filterOngoing,
					filterCompleted,
					filterThemeId,
				})
			)
		}
	}, [searchQuery, sortKey, sortDir, filterOngoing, filterCompleted, filterThemeId, storageKey])

	const handleSortToggle = () => {
		onSortDirChange(sortDir === "asc" ? "desc" : "asc")
	}

	const handleClear = () => {
		onSearchChange("")
		onSortKeyChange("lastOpened")
		onSortDirChange("desc")
		onFilterOngoingChange(false)
		onFilterCompletedChange(false)
		onFilterThemeIdChange("all")
		onClear?.()
	}

	const hasActiveFilters = searchQuery.trim() !== "" || filterOngoing || filterCompleted || filterThemeId !== "all" || sortKey !== "lastOpened" || sortDir !== "desc"

	return (
		<div className={styles.bar}>
			{/* Search */}
			<div className={styles.search}>
				<svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					placeholder={t("searchPlaceholder")}
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className={styles.searchInput}
				/>
				{searchQuery && (
					<button
						onClick={() => onSearchChange("")}
						className={styles.clearButton}
						aria-label={tCommon("close")}
						type="button"
					>
						<svg className={styles.clearIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				)}
			</div>

			{/* Theme Filter */}
			{availableThemes.length > 0 && (
				<select
					value={filterThemeId === "all" ? "all" : filterThemeId}
					onChange={(e) => onFilterThemeIdChange(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
					className={styles.themeSelect}
					aria-label={t("filterTheme")}
				>
					<option value="all">{t("allThemes")}</option>
					{availableThemes.map((theme) => (
						<option key={theme.themeId} value={theme.themeId}>
							{theme.themeName}
						</option>
					))}
				</select>
			)}

			{/* Sort */}
			<div className={styles.sort}>
				<select
					value={sortKey}
					onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
					className={styles.sortSelect}
					aria-label={t("sortBy")}
				>
					<option value="lastOpened">{t("sortLastOpened")}</option>
					<option value="name">{t("sortName")}</option>
					<option value="parts">{t("sortParts")}</option>
				</select>
				<button
					onClick={handleSortToggle}
					className={styles.sortButton}
					aria-label={sortDir === "asc" ? t("sortAsc") : t("sortDesc")}
					type="button"
				>
					<svg className={styles.sortIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
						{sortDir === "asc" ? (
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
						) : (
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						)}
					</svg>
				</button>
			</div>

			{/* Filters */}
			<div className={styles.filters}>
				<label className={styles.filterToggle}>
					<input
						type="checkbox"
						checked={filterOngoing}
						onChange={(e) => onFilterOngoingChange(e.target.checked)}
						className={styles.filterInput}
					/>
					<span className={styles.filterText}>{t("ongoing")}</span>
				</label>
				{hasProgress && (
					<label className={styles.filterToggle}>
						<input
							type="checkbox"
							checked={filterCompleted}
							onChange={(e) => onFilterCompletedChange(e.target.checked)}
							className={styles.filterInput}
						/>
						<span className={styles.filterText}>{t("hideCompleted")}</span>
					</label>
				)}
			</div>

			{/* Clear Button */}
			{hasActiveFilters && (
				<button
					onClick={handleClear}
					className={styles.clearFiltersButton}
					type="button"
				>
					{t("clearFilters")}
				</button>
			)}
		</div>
	)
}

