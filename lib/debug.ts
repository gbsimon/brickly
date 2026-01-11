/**
 * Debug utilities and environment flag checks
 * 
 * Debug features are disabled by default and only enabled via environment variables.
 * This ensures debug code never runs in production unless explicitly enabled.
 */

/**
 * Check if debug UI should be enabled
 * Controlled by NEXT_PUBLIC_DEBUG_UI environment variable
 */
export function isDebugUIEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check env var
    return process.env.NEXT_PUBLIC_DEBUG_UI === 'true';
  }
  // Client-side: check env var (available via NEXT_PUBLIC_ prefix)
  return process.env.NEXT_PUBLIC_DEBUG_UI === 'true';
}

/**
 * Check if API debug logging should be enabled
 * Controlled by DEBUG_API environment variable
 */
export function isAPIDebugEnabled(): boolean {
  return process.env.DEBUG_API === 'true';
}

/**
 * Check if DB debug logging should be enabled
 * Controlled by DEBUG_DB environment variable
 */
export function isDBDebugEnabled(): boolean {
  return process.env.DEBUG_DB === 'true';
}

/**
 * Check if client debug logging should be enabled
 * Controlled by NEXT_PUBLIC_DEBUG_CLIENT environment variable
 */
export function isClientDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_DEBUG_CLIENT === 'true';
  }
  return process.env.NEXT_PUBLIC_DEBUG_CLIENT === 'true';
}

/**
 * Get all enabled debug flags (for diagnostics display)
 * Returns only flags that are enabled (safe for display)
 */
export function getEnabledDebugFlags(): string[] {
  const flags: string[] = [];
  
  if (isDebugUIEnabled()) {
    flags.push('DEBUG_UI');
  }
  
  if (isAPIDebugEnabled()) {
    flags.push('DEBUG_API');
  }
  
  if (isDBDebugEnabled()) {
    flags.push('DEBUG_DB');
  }
  
  if (isClientDebugEnabled()) {
    flags.push('DEBUG_CLIENT');
  }
  
  return flags;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
