"use client"

import { Suspense, useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams, useParams } from "next/navigation"
import styles from "./page.module.scss"
import { useTranslations } from "next-intl"

interface ProviderStatus {
	google: boolean
	apple: boolean
	email: boolean
}

function SignInForm() {
	const searchParams = useSearchParams()
	const params = useParams()
	const locale = (params?.locale as string) || "en"
	const callbackUrl = searchParams.get("callbackUrl") || `/${locale}`
	const t = useTranslations("auth.signIn")
	const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
	const [authError, setAuthError] = useState<string | null>(null)
	const [isCheckingConfig, setIsCheckingConfig] = useState(true)
	const [providers, setProviders] = useState<ProviderStatus>({
		google: false,
		apple: false,
		email: false,
	})
	const [email, setEmail] = useState("")

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
				} else {
					setProviders(
						data.providers || {
							google: false,
							apple: false,
							email: false,
						}
					)
					if (data.warnings && data.warnings.length > 0) {
						console.warn(
							"Auth configuration warnings:",
							data.warnings
						)
					}
				}
			} catch (error) {
				console.error("Failed to check auth configuration:", error)
			} finally {
				setIsCheckingConfig(false)
			}
		}

		checkAuthConfig()
	}, [])

	const handleOAuthSignIn = async (provider: string) => {
		if (authError) return
		setLoadingProvider(provider)
		setAuthError(null)
		try {
			await signIn(provider, { callbackUrl })
		} catch (error) {
			console.error("Sign in error:", error)
			setAuthError(t("signInError"))
			setLoadingProvider(null)
		}
	}

	const handleEmailSignIn = async (e: React.FormEvent) => {
		e.preventDefault()
		if (authError || !email.trim()) return
		setLoadingProvider("nodemailer")
		setAuthError(null)
		try {
			await signIn("nodemailer", { email, callbackUrl })
		} catch (error) {
			console.error("Email sign in error:", error)
			setAuthError(t("emailSignInError"))
			setLoadingProvider(null)
		}
	}

	const hasOAuthProviders = providers.google || providers.apple
	const isDisabled = !!loadingProvider || !!authError || isCheckingConfig

	return (
		<div className={`safe ${styles.page}`}>
			<div className={`cardSolid ${styles.card}`}>
				{/* Logo */}
				<div className={styles.logoWrap}>
					<img
						src="/brick.svg"
						alt={t("title")}
						className={styles.logo}
					/>
				</div>

				{/* Heading */}
				<h1 className={`largeTitle ${styles.title}`}>{t("title")}</h1>

				{/* Description */}
				<p className={`subhead ${styles.description}`}>
					{t("description")}
				</p>
				<p className={`subhead ${styles.subtitle}`}>
					{t("signInPrompt")}
				</p>

				{/* Auth configuration error */}
				{isCheckingConfig ? (
					<div
						className={`${styles.status} ${styles.statusWarning}`}
					>
						<p className={styles.statusWarningText}>
							{t("checkingConfig")}
						</p>
					</div>
				) : authError ? (
					<div className={`${styles.status} ${styles.statusError}`}>
						<p className={styles.statusTitle}>
							{t("configError")}
						</p>
						<p className={styles.statusText}>{authError}</p>
						<p className={styles.statusHint}>
							{t("envExample")}
						</p>
					</div>
				) : null}

				{/* OAuth buttons */}
				<div className={styles.providers}>
					{providers.google && (
						<button
							onClick={() => handleOAuthSignIn("google")}
							disabled={isDisabled}
							className={`buttonPrimary ${styles.button}`}
						>
							{loadingProvider === "google" ? (
								<span className={styles.buttonLabel}>
									<div className={styles.buttonSpinner}></div>
									{t("signingIn")}
								</span>
							) : (
								<span className={styles.buttonLabel}>
									<svg
										className={styles.buttonIcon}
										viewBox="0 0 24 24"
									>
										<path
											fill="currentColor"
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
										/>
										<path
											fill="currentColor"
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										/>
										<path
											fill="currentColor"
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
										/>
										<path
											fill="currentColor"
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
										/>
									</svg>
									{t("signInWithGoogle")}
								</span>
							)}
						</button>
					)}

					{providers.apple && (
						<button
							onClick={() => handleOAuthSignIn("apple")}
							disabled={isDisabled}
							className={`buttonPrimary ${styles.button} ${styles.buttonApple}`}
						>
							{loadingProvider === "apple" ? (
								<span className={styles.buttonLabel}>
									<div className={styles.buttonSpinner}></div>
									{t("signingIn")}
								</span>
							) : (
								<span className={styles.buttonLabel}>
									<svg
										className={styles.buttonIcon}
										viewBox="0 0 24 24"
									>
										<path
											fill="currentColor"
											d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
										/>
									</svg>
									{t("signInWithApple")}
								</span>
							)}
						</button>
					)}
				</div>

				{/* Divider between OAuth and email */}
				{hasOAuthProviders && providers.email && (
					<div className={styles.divider}>
						<span className={styles.dividerText}>
							{t("orContinueWith")}
						</span>
					</div>
				)}

				{/* Email sign-in */}
				{providers.email && (
					<form
						onSubmit={handleEmailSignIn}
						className={styles.emailForm}
					>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t("emailPlaceholder")}
							required
							disabled={isDisabled}
							className={styles.emailInput}
						/>
						<button
							type="submit"
							disabled={isDisabled || !email.trim()}
							className={`buttonPrimary ${styles.button} ${styles.buttonEmail}`}
						>
							{loadingProvider === "nodemailer" ? (
								<span className={styles.buttonLabel}>
									<div className={styles.buttonSpinner}></div>
									{t("sendingLink")}
								</span>
							) : (
								<span className={styles.buttonLabel}>
									<svg
										className={styles.buttonIcon}
										viewBox="0 0 24 24"
									>
										<path
											fill="currentColor"
											d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
										/>
									</svg>
									{t("sendMagicLink")}
								</span>
							)}
						</button>
					</form>
				)}
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
			}
		>
			<SignInForm />
		</Suspense>
	)
}
