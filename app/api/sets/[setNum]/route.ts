import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createRebrickableClient } from '@/rebrickable/client';
import { mapSetDetail } from '@/rebrickable/mappers';
import { removeSetFromDB } from '@/lib/db/sets';
import { ensureUser } from '@/lib/db/users';
import { getCachedSet, upsertCachedSet, getCacheTtlMs } from '@/lib/db/cache';
import { createLogger, createErrorResponse } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  const logger = createLogger(request);
  
  // Check rate limit (only for GET, not DELETE)
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
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    if (!setNum) {
      logger.warn('Missing setNum parameter');
      return NextResponse.json(
        { ok: false, message: 'Set number is required' },
        { status: 400 }
      );
    }

    if (!refresh) {
      try {
        const cached = await getCachedSet(setNum, getCacheTtlMs());
        if (cached) {
          logger.logRequest(200, { setNum, cache: 'hit' });
          return NextResponse.json(cached, {
            status: 200,
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
            },
          });
        }
      } catch (cacheError) {
        logger.warn('Cache read failed, falling back to API', { setNum, error: cacheError });
      }
    }

    logger.info('Fetching set from Rebrickable', { setNum, refresh });
    // Create client and fetch set details from Rebrickable
    const client = createRebrickableClient();
    const set = await client.getSet(setNum);

    // Fetch theme name
    let themeName: string | undefined;
    try {
      const theme = await client.getTheme(set.theme_id);
      themeName = theme.name;
    } catch (error) {
      logger.warn('Failed to fetch theme', { themeId: set.theme_id, error });
      // Continue without theme name
    }

    // Map to simplified DTO
    const setDetail = mapSetDetail(set);
    if (themeName) {
      setDetail.themeName = themeName;
    }

    try {
      await upsertCachedSet(setNum, setDetail);
    } catch (cacheError) {
      logger.warn('Cache write failed', { setNum, error: cacheError });
    }

    logger.logRequest(200, { setNum });
    // Return response with caching headers
    return NextResponse.json(
      setDetail,
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to fetch set', error);

    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes('REBRICKABLE_API_KEY')) {
      return NextResponse.json(
        { ok: false, message: 'API configuration error', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      createErrorResponse(error, 'Failed to fetch set'),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  const logger = createLogger(request);
  
  try {
    const session = await auth();

    if (!session?.user?.id) {
      logger.warn('Unauthorized request to delete set');
      return NextResponse.json(
        { ok: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { setNum } = await params;

    if (!setNum) {
      logger.warn('Missing setNum parameter');
      return NextResponse.json(
        { ok: false, message: 'Set number is required' },
        { status: 400 }
      );
    }

    const user = await ensureUser(
      session.user.id,
      session.user.email,
      session.user.name,
      session.user.image
    );
    const userLogger = logger.child({ userId: user.id });

    userLogger.info('Removing set', { setNum });
    await removeSetFromDB(user.id, setNum);
    userLogger.logRequest(200, { setNum });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to delete set', err);
    return NextResponse.json(
      createErrorResponse(err, 'Failed to delete set'),
      { status: 500 }
    );
  }
}
