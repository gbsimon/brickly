import { NextRequest, NextResponse } from 'next/server';
import { createRebrickableClient } from '@/rebrickable/client';
import { mapSetToSearchResult } from '@/rebrickable/mappers';
import { createLogger, createErrorResponse } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const logger = createLogger(request);
  
  // Check rate limit
  const rateLimit = checkRateLimit(request, RATE_LIMITS.PROXY);
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { remaining: rateLimit.remaining });
    return NextResponse.json(
      {
        ok: false,
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': RATE_LIMITS.PROXY.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
        },
      }
    );
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

    // Validate inputs
    if (page < 1) {
      logger.warn('Invalid page parameter', { page });
      return NextResponse.json(
        { ok: false, message: 'Page must be >= 1', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (pageSize < 1 || pageSize > 100) {
      logger.warn('Invalid pageSize parameter', { pageSize });
      return NextResponse.json(
        { ok: false, message: 'Page size must be between 1 and 100', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    logger.info('Searching sets', { query, page, pageSize });
    // Create client and fetch from Rebrickable
    const client = createRebrickableClient();
    const response = await client.searchSets(query, page, pageSize);

    // Map to simplified DTOs
    const results = response.results.map(mapSetToSearchResult);

    logger.logRequest(200, { query, page, pageSize, resultsCount: results.length });
    // Return response with caching headers
    return NextResponse.json(
      {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to search sets', error);

    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes('REBRICKABLE_API_KEY')) {
      return NextResponse.json(
        { ok: false, message: 'API configuration error', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      createErrorResponse(error, 'Failed to search sets'),
      { status: 500 }
    );
  }
}

