"use client"

import { Suspense, useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import styles from "./page.module.scss"

function SignInForm() {
	const searchParams = useSearchParams()
	const callbackUrl = searchParams.get("callbackUrl") || "/"
	const [isLoading, setIsLoading] = useState(false)
	const [authError, setAuthError] = useState<string | null>(null)
	const [isCheckingConfig, setIsCheckingConfig] = useState(true)

	// Check auth configuration on mount
	useEffect(() => {
		async function checkAuthConfig() {
			try {
				const response = await fetch("/api/auth/check")
				const data = await response.json()
				
				if (!data.configured) {
					setAuthError(
						`Authentication is not properly configured. Missing: ${data.missing.join(", ")}. ` +
						`Please check your .env.local file and ensure all required environment variables are set.`
					)
				} else if (data.warnings && data.warnings.length > 0) {
					console.warn("Auth configuration warnings:", data.warnings)
				}
			} catch (error) {
				console.error("Failed to check auth configuration:", error)
				// Don't block sign-in if check fails - might be a network issue
			} finally {
				setIsCheckingConfig(false)
			}
		}
		
		checkAuthConfig()
	}, [])

	const handleGoogleSignIn = async () => {
		if (authError) {
			return // Don't attempt sign-in if config is invalid
		}
		
		setIsLoading(true)
		setAuthError(null)
		try {
			await signIn("google", { callbackUrl })
		} catch (error) {
			console.error("Sign in error:", error)
			setAuthError(
				"Failed to sign in. Please check that your Google OAuth credentials are correct and that the redirect URI is configured in Google Cloud Console."
			)
			setIsLoading(false)
		}
	}

	return (
		<div className={`safe ${styles.page}`}>
			<div className={`cardSolid ${styles.card}`}>
				{/* Logo */}
				<div className={styles.logoWrap}>
					<img 
						src="/brick.svg" 
						alt="BrickByBrick Logo" 
						className={styles.logo}
					/>
				</div>

				{/* Heading */}
				<h1 className={`largeTitle ${styles.title}`}>BrickByBrick</h1>
				
				{/* Description */}
				<p className={`subhead ${styles.description}`}>
					Track your LEGO sets and build your collection piece by piece
				</p>
				<p className={`subhead ${styles.subtitle}`}>
					Sign in to get started
				</p>

				{/* Auth configuration error */}
				{isCheckingConfig ? (
					<div className={`${styles.status} ${styles.statusWarning}`}>
						<p className={styles.statusWarningText}>
							Checking authentication configuration...
						</p>
					</div>
				) : authError ? (
					<div className={`${styles.status} ${styles.statusError}`}>
						<p className={styles.statusTitle}>
							Configuration Error
						</p>
						<p className={styles.statusText}>
							{authError}
						</p>
						<p className={styles.statusHint}>
							See .env.example for required environment variables.
						</p>
					</div>
				) : null}

				{/* Sign in button */}
				<button 
					onClick={handleGoogleSignIn} 
					disabled={isLoading || !!authError || isCheckingConfig} 
					className={`buttonPrimary ${styles.button}`}
				>
					{isLoading ? (
						<span className={styles.buttonLabel}>
							<div className={styles.buttonSpinner}></div>
							Signing in...
						</span>
					) : (
						<span className={styles.buttonLabel}>
							<svg className={styles.buttonIcon} viewBox="0 0 24 24">
								<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
								<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
								<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
								<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
							</svg>
							Sign in with Google
						</span>
					)}
				</button>
			</div>
		</div>
	)
}

export default function SignInPage() {
	return (
		<Suspense
			fallback={
				<div className={`safe ${styles.page}`}>
					<div className={styles.fallbackSpinner}></div>
				</div>
			}>
			<SignInForm />
		</Suspense>
	)
}
