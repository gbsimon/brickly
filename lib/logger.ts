// Structured logging utility for API routes

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  duration?: number;
  status?: number;
  [key: string]: any;
}

/**
 * Generate a unique request ID for tracking requests
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Structured logger for API routes
 */
export class Logger {
  private requestId: string;
  private userId?: string;
  private route?: string;
  private method?: string;
  private startTime: number;

  constructor(context: LogContext = {}) {
    this.requestId = context.requestId || generateRequestId();
    this.userId = context.userId;
    this.route = context.route;
    this.method = context.method;
    this.startTime = Date.now();
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LogContext>): Logger {
    return new Logger({
      requestId: this.requestId,
      userId: this.userId,
      route: this.route,
      method: this.method,
      ...additionalContext,
    });
  }

  /**
   * Get the duration since logger creation
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): void {
    const logEntry: any = {
      level,
      message,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      duration: this.getDuration(),
    };

    if (this.userId) {
      logEntry.userId = this.userId;
    }

    if (this.route) {
      logEntry.route = this.route;
    }

    if (this.method) {
      logEntry.method = this.method;
    }

    if (data) {
      logEntry.data = data;
    }

    // Format for console (structured JSON for Vercel logs)
    const logString = JSON.stringify(logEntry);
    
    switch (level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'debug':
        // Only log debug messages if DEBUG_API is enabled or in development
        if (process.env.DEBUG_API === 'true' || process.env.NODE_ENV === 'development') {
          console.debug(logString);
        }
        break;
      default:
        console.log(logString);
    }
  }

  info(message: string, data?: any): void {
    this.formatMessage('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.formatMessage('warn', message, data);
  }

  error(message: string, error?: Error | any, data?: any): void {
    const errorData = {
      ...data,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        meta: error?.meta,
      },
    };
    this.formatMessage('error', message, errorData);
  }

  debug(message: string, data?: any): void {
    this.formatMessage('debug', message, data);
  }

  /**
   * Log request completion with status code
   */
  logRequest(status: number, data?: any): void {
    this.formatMessage('info', `Request completed`, { ...data, status });
  }
}

/**
 * Create a logger instance for an API route
 */
export function createLogger(
  request: Request,
  userId?: string
): Logger {
  const url = new URL(request.url);
  const route = url.pathname;
  const method = request.method;

  return new Logger({
    requestId: generateRequestId(),
    userId,
    route,
    method,
  });
}

/**
 * Helper to create a normalized error response
 */
export interface NormalizedError {
  ok: false;
  message: string;
  code?: string;
  meta?: any;
  name?: string;
}

export function createErrorResponse(
  error: any,
  defaultMessage: string = 'Internal server error'
): NormalizedError {
  return {
    ok: false,
    message: defaultMessage,
    code: error?.code,
    meta: error?.meta,
    name: error?.name,
  };
}
