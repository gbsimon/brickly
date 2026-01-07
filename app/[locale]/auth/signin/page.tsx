"use client"

import { Suspense, useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams, useParams } from "next/navigation"
import { useTranslations } from "next-intl"

function SignInForm() {
	const searchParams = useSearchParams()
	const params = useParams()
	const locale = params?.locale as string || 'en'
	const callbackUrl = searchParams.get("callbackUrl") || `/${locale}`
	const t = useTranslations('auth.signIn')
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
			setAuthError(t('signInError'))
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen safe flex items-center justify-center" style={{ background: "var(--bg)" }}>
			<div className="cardSolid p-8 max-w-md w-full mx-4">
				{/* Logo */}
				<div className="flex justify-center mb-6">
					<img 
						src="/brick.svg" 
						alt={t('title')}
						className="h-20 w-20"
					/>
				</div>

				{/* Heading */}
				<h1 className="largeTitle mb-3 text-center">{t('title')}</h1>
				
				{/* Description */}
				<p className="subhead mb-2 text-center" style={{ fontSize: '17px', color: 'var(--text)' }}>
					{t('description')}
				</p>
				<p className="subhead mb-8 text-center">
					{t('signInPrompt')}
				</p>

				{/* Auth configuration error */}
				{isCheckingConfig ? (
					<div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
						<p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
							{t('checkingConfig')}
						</p>
					</div>
				) : authError ? (
					<div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
						<p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
							{t('configError')}
						</p>
						<p className="text-xs text-red-700 dark:text-red-300">
							{authError}
						</p>
						<p className="text-xs text-red-600 dark:text-red-400 mt-2">
							{t('envExample')}
						</p>
					</div>
				) : null}

				{/* Sign in button */}
				<button 
					onClick={handleGoogleSignIn} 
					disabled={isLoading || !!authError || isCheckingConfig} 
					className="buttonPrimary w-full disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading ? (
						<span className="flex items-center justify-center gap-2">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
							{t('signingIn')}
						</span>
					) : (
						<span className="flex items-center justify-center gap-2">
							<svg className="h-5 w-5" viewBox="0 0 24 24">
								<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
								<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
								<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
								<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
							</svg>
							{t('signInWithGoogle')}
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
				<div className="min-h-screen safe flex items-center justify-center" style={{ background: "var(--bg)" }}>
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
				</div>
			}>
			<SignInForm />
		</Suspense>
	)
}


