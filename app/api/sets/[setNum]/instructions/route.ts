import { NextRequest, NextResponse } from 'next/server';
import { createRebrickableClient } from '@/rebrickable/client';
import { mapInstruction } from '@/rebrickable/mappers';
import { createLogger, createErrorResponse } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
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
    const { setNum } = await params;

    if (!setNum) {
      logger.warn('Missing setNum parameter');
      return NextResponse.json(
        { ok: false, message: 'Set number is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching set instructions from Rebrickable', { setNum });
    const client = createRebrickableClient();
    const response = await client.getSetInstructions(setNum, 1, 100);

    // Filter for PDF files only and map to simplified DTOs
    const pdfInstructions = response.results
      .filter((inst) => inst.download_url.toLowerCase().endsWith('.pdf'))
      .map(mapInstruction);

    logger.logRequest(200, { setNum, instructionsCount: pdfInstructions.length });
    
    // Return response with caching headers
    return NextResponse.json(
      {
        count: pdfInstructions.length,
        instructions: pdfInstructions,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to fetch set instructions', error);

    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes('REBRICKABLE_API_KEY')) {
      return NextResponse.json(
        { ok: false, message: 'API configuration error', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // If instructions endpoint doesn't exist or returns 404, return empty array
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
      try {
        const { setNum: setNumParam } = await params;
        logger.warn('Instructions endpoint not found for set', { setNum: setNumParam });
      } catch {
        // Ignore if params already consumed
      }
      return NextResponse.json(
        {
          count: 0,
          instructions: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      createErrorResponse(error, 'Failed to fetch set instructions'),
      { status: 500 }
    );
  }
}
