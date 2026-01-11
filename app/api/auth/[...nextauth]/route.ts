import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Wrap handlers to add rate limiting for sign-in attempts
const originalGET = handlers.GET;
const originalPOST = handlers.POST;

export async function GET(request: NextRequest) {
  return originalGET(request);
}

export async function POST(request: NextRequest) {
  // Check if this is a sign-in attempt
  const url = request.nextUrl;
  const isSignIn = url.pathname.includes('/signin') || url.searchParams.has('callbackUrl');
  
  if (isSignIn) {
    const logger = createLogger(request);
    const rateLimit = checkRateLimit(request, RATE_LIMITS.AUTH);
    
    if (!rateLimit.allowed) {
      logger.warn('Auth rate limit exceeded', { remaining: rateLimit.remaining });
      return NextResponse.json(
        {
          ok: false,
          message: 'Too many sign-in attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMITS.AUTH.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }
  }
  
  return originalPOST(request);
}

