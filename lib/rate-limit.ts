/**
 * Simple in-memory rate limiter for API routes
 * 
 * Uses a sliding window approach with per-IP tracking.
 * Note: This is in-memory only and won't persist across serverless function instances.
 * For production at scale, consider upgrading to Redis-based rate limiting.
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

// In-memory store: IP -> RequestRecord
const requestStore = new Map<string, RequestRecord>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupTimer() {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestStore.entries()) {
      if (record.resetAt < now) {
        requestStore.delete(ip);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Get client IP from request
 */
function getClientIP(request: Request): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback (won't work in serverless, but good for local dev)
  return 'unknown';
}

/**
 * Check if request should be rate limited
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  startCleanupTimer();
  
  const ip = getClientIP(request);
  const now = Date.now();
  
  let record = requestStore.get(ip);
  
  // If no record or window expired, create new record
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }
  
  // Increment count
  record.count++;
  requestStore.set(ip, record);
  
  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);
  
  return {
    allowed,
    remaining,
    resetAt: record.resetAt,
  };
}

/**
 * Rate limit configurations for different route types
 */
export const RATE_LIMITS = {
  // Rebrickable proxy routes: 60 requests per minute
  PROXY: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
  
  // Auth routes: 10 sign-in attempts per 15 minutes
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
} as const;
