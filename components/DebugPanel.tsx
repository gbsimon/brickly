"use client"

import { useState, useEffect } from "react"
import { isDebugUIEnabled, getEnabledDebugFlags } from "@/lib/debug"
import styles from "./DebugPanel.module.scss"

export default function DebugPanel() {
	// All hooks must be called unconditionally at the top level
	const [isOpen, setIsOpen] = useState(false)
	const [debugInfo, setDebugInfo] = useState<any>({})
	const [isEnabled, setIsEnabled] = useState(false)
	const [session, setSession] = useState<any>(null)

	// Check if debug UI is enabled via env flag
	useEffect(() => {
		setIsEnabled(isDebugUIEnabled())
	}, [])

	// Get session info safely (only if debug UI enabled)
	useEffect(() => {
		if (!isEnabled) return

		// Fetch session from API instead of using useSession hook to avoid hooks order issues
		fetch("/api/auth/session")
			.then((res) => res.json())
			.then((data) => {
				if (data?.user) {
					setSession({ user: data.user })
				}
			})
			.catch(() => {
				// Ignore errors
			})
	}, [isEnabled])

	// Collect debug information
	useEffect(() => {
		if (!isEnabled) return

		const info: any = {
			environment: process.env.NODE_ENV,
			timestamp: new Date().toISOString(),
			debugFlags: getEnabledDebugFlags(),
			userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
			online: typeof navigator !== "undefined" ? navigator.onLine : true,
			screen: typeof window !== "undefined" ? {
				width: window.screen.width,
				height: window.screen.height,
				innerWidth: window.innerWidth,
				innerHeight: window.innerHeight,
			} : {},
		}

		if (session?.user) {
			info.session = {
				userId: session.user.id,
				email: session.user.email,
				name: session.user.name,
			}
		}

		// Check localStorage
		if (typeof window !== "undefined") {
			info.localStorage = {
				keys: Object.keys(localStorage).filter((key) =>
					key.startsWith("hideCompleted") ||
					key.startsWith("viewMode") ||
					key.startsWith("filter") ||
					key.startsWith("sort")
				),
			}
		}

		setDebugInfo(info)
	}, [session, isEnabled])

	// Only render if debug UI is enabled via env flag
	if (!isEnabled) {
		return null
	}

	const togglePanel = () => {
		setIsOpen(!isOpen)
	}

	return (
		<>
			{/* Toggle Button */}
			<button
				onClick={togglePanel}
				className={styles.toggleButton}
				title="Debug Panel"
			>
				<svg className={styles.toggleIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
			</button>

			{/* Debug Panel */}
			{isOpen && (
				<div className={styles.panel}>
					<div className={styles.header}>
						<h3 className={styles.title}>Debug Panel</h3>
						<button
							onClick={togglePanel}
							className={styles.closeButton}
						>
							<svg className={styles.toggleIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div className={styles.infoList}>
						<div>
							<strong>Environment:</strong> {debugInfo.environment}
						</div>
						<div>
							<strong>Timestamp:</strong> {debugInfo.timestamp}
						</div>
						{debugInfo.debugFlags && debugInfo.debugFlags.length > 0 && (
							<div>
								<strong>Debug Flags:</strong> {debugInfo.debugFlags.join(', ')}
							</div>
						)}
						<div>
							<strong>Online:</strong> {debugInfo.online ? "Yes" : "No"}
						</div>
						{debugInfo.screen && (
							<div>
								<strong>Screen:</strong> {debugInfo.screen.width}x{debugInfo.screen.height} (inner: {debugInfo.screen.innerWidth}x{debugInfo.screen.innerHeight})
							</div>
						)}
						{debugInfo.session && (
							<div>
								<strong>User:</strong> {debugInfo.session.email || debugInfo.session.userId}
							</div>
						)}
						{debugInfo.localStorage && (
							<div>
								<strong>LocalStorage Keys:</strong> {debugInfo.localStorage.keys.length}
							</div>
						)}
					</div>

					<div className={styles.footer}>
						<button
							onClick={() => {
								if (typeof window !== "undefined") {
									localStorage.clear()
									window.location.reload()
								}
							}}
							className={styles.footerButton}
						>
							Clear LocalStorage & Reload
						</button>
					</div>
				</div>
			)}
		</>
	)
}
