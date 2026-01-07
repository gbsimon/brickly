"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { logClientError } from "@/lib/client-logger"

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
				<div className="min-h-screen safe flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
					<div className="cardSolid p-6 max-w-md w-full">
						<div className="flex justify-center mb-4">
							<svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						
						<h1 className="largeTitle mb-3 text-center">Something went wrong</h1>
						
						<p className="subhead mb-4 text-center" style={{ color: "var(--muted)" }}>
							We encountered an unexpected error. Please try refreshing the page.
						</p>

						{process.env.NODE_ENV === "development" && this.state.error && (
							<div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
								<p className="text-xs font-mono text-red-800 dark:text-red-200 break-all mb-2">
									{this.state.error.toString()}
								</p>
								{this.state.errorContext.route && (
									<p className="text-xs text-red-700 dark:text-red-300 mb-1">
										<strong>Route:</strong> {this.state.errorContext.route}
									</p>
								)}
								{this.state.errorContext.setNum && (
									<p className="text-xs text-red-700 dark:text-red-300 mb-1">
										<strong>Set:</strong> {this.state.errorContext.setNum}
									</p>
								)}
								{this.state.errorInfo && (
									<details className="mt-2">
										<summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
											Stack trace
										</summary>
										<pre className="text-xs text-red-700 dark:text-red-300 mt-2 overflow-auto max-h-40">
											{this.state.errorInfo.componentStack}
										</pre>
									</details>
								)}
							</div>
						)}

						<div className="flex gap-3">
							<button
								onClick={this.handleReset}
								className="buttonPrimary flex-1"
							>
								Try Again
							</button>
							<button
								onClick={() => window.location.reload()}
								className="buttonSecondary flex-1"
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

