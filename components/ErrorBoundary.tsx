"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { logClientError } from "@/lib/client-logger"
import styles from "./ErrorBoundary.module.scss"

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
	errorInfo: ErrorInfo | null
	errorContext: {
		route?: string
		setNum?: string
		lastAction?: string
		timestamp: string
	}
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorContext: {
				timestamp: new Date().toISOString(),
			},
		}
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return {
			hasError: true,
			error,
			errorInfo: null,
			errorContext: {
				route: typeof window !== 'undefined' ? window.location.pathname : undefined,
				timestamp: new Date().toISOString(),
			},
		}
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Capture context from URL or other sources
		const route = typeof window !== 'undefined' ? window.location.pathname : undefined
		const setNumMatch = route?.match(/\/sets\/([^\/]+)/)
		const setNum = setNumMatch ? setNumMatch[1] : undefined

		// Log error with context (including component stack)
		logClientError(error, { 
			route, 
			setNum,
			lastAction: 'ErrorBoundary',
			componentStack: errorInfo.componentStack,
		})
		
		this.setState({
			error,
			errorInfo,
			errorContext: {
				route,
				setNum,
				timestamp: new Date().toISOString(),
			},
		})
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		})
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className={`${styles.container} safe`}>
					<div className={styles.card}>
						<div className={styles.iconRow}>
							<svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						
						<h1 className={styles.title}>Something went wrong</h1>
						
						<p className={styles.subtitle}>
							We encountered an unexpected error. Please try refreshing the page.
						</p>

						{process.env.NODE_ENV === "development" && this.state.error && (
							<div className={styles.details}>
								<p className={styles.detailsText}>
									{this.state.error.toString()}
								</p>
								{this.state.errorContext.route && (
									<p className={styles.detailsRow}>
										<strong>Route:</strong> {this.state.errorContext.route}
									</p>
								)}
								{this.state.errorContext.setNum && (
									<p className={styles.detailsRow}>
										<strong>Set:</strong> {this.state.errorContext.setNum}
									</p>
								)}
								{this.state.errorInfo && (
									<details className={styles.detailsSection}>
										<summary className={styles.summary}>
											Stack trace
										</summary>
										<pre className={styles.stack}>
											{this.state.errorInfo.componentStack}
										</pre>
									</details>
								)}
							</div>
						)}

						<div className={styles.actions}>
							<button
								onClick={this.handleReset}
								className={`buttonPrimary ${styles.actionButton}`}
							>
								Try Again
							</button>
							<button
								onClick={() => window.location.reload()}
								className={`buttonSecondary ${styles.actionButton}`}
							>
								Refresh Page
							</button>
						</div>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
