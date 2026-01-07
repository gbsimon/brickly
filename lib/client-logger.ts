// Client-side error logging utility

interface ClientErrorContext {
	route?: string
	setNum?: string
	lastAction?: string
	[key: string]: any
}

/**
 * Log client-side errors with context
 * This helps with debugging by providing contextual information
 */
export function logClientError(
	error: Error | string,
	context?: ClientErrorContext
): void {
	const errorMessage = typeof error === 'string' ? error : error.message
	const errorName = typeof error === 'string' ? 'ClientError' : error.name
	const errorStack = typeof error === 'string' ? undefined : error.stack

	const route = context?.route || (typeof window !== 'undefined' ? window.location.pathname : 'unknown')
	const setNum = context?.setNum || extractSetNumFromRoute(route)

	const errorData = {
		level: 'error',
		message: errorMessage,
		name: errorName,
		stack: errorStack,
		context: {
			route,
			setNum,
			lastAction: context?.lastAction,
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
			timestamp: new Date().toISOString(),
			...context,
		},
	}

	// Log as structured JSON
	if (process.env.NODE_ENV === 'development') {
		console.error('[CLIENT_ERROR]', JSON.stringify(errorData, null, 2))
	} else {
		// In production, you might want to send to an error reporting service
		console.error('[CLIENT_ERROR]', JSON.stringify(errorData))
	}
}

/**
 * Log client-side warnings with context
 */
export function logClientWarning(
	message: string,
	context?: ClientErrorContext
): void {
	const route = context?.route || (typeof window !== 'undefined' ? window.location.pathname : 'unknown')
	const setNum = context?.setNum || extractSetNumFromRoute(route)

	const warningData = {
		level: 'warn',
		message,
		context: {
			route,
			setNum,
			lastAction: context?.lastAction,
			timestamp: new Date().toISOString(),
			...context,
		},
	}

	if (process.env.NODE_ENV === 'development') {
		console.warn('[CLIENT_WARNING]', JSON.stringify(warningData, null, 2))
	} else {
		console.warn('[CLIENT_WARNING]', JSON.stringify(warningData))
	}
}

/**
 * Extract set number from route path
 */
function extractSetNumFromRoute(route: string): string | undefined {
	const match = route.match(/\/sets\/([^\/]+)/)
	return match ? match[1] : undefined
}

/**
 * Create a context logger for a specific component/feature
 */
export function createContextLogger(context: ClientErrorContext) {
	return {
		error: (error: Error | string, additionalContext?: ClientErrorContext) => {
			logClientError(error, { ...context, ...additionalContext })
		},
		warning: (message: string, additionalContext?: ClientErrorContext) => {
			logClientWarning(message, { ...context, ...additionalContext })
		},
	}
}

