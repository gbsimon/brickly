// API route to toggle ongoing status for a set
// PATCH /api/sets/[setNum]/ongoing

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { toggleSetOngoing } from '@/lib/db/sets';
import { ensureUser } from '@/lib/db/users';
import { createLogger, createErrorResponse } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  const logger = createLogger(request);
  
  try {
    const session = await auth();

    if (!session?.user?.id) {
      logger.warn('Unauthorized request to toggle ongoing status');
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

    const body = await request.json();
    const { isOngoing } = body;

    if (typeof isOngoing !== 'boolean') {
      logger.warn('Invalid isOngoing parameter', { isOngoing });
      return NextResponse.json(
        { ok: false, message: 'isOngoing must be a boolean', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Ensure user exists and resolve canonical user id
    const user = await ensureUser(
      session.user.id,
      session.user.email,
      session.user.name,
      session.user.image
    );
    const userLogger = logger.child({ userId: user.id });

    userLogger.info('Toggling ongoing status', { setNum, isOngoing });
    await toggleSetOngoing(user.id, setNum, isOngoing);
    userLogger.logRequest(200, { setNum, isOngoing });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to toggle ongoing status', err);
    return NextResponse.json(
      createErrorResponse(err, 'Failed to toggle ongoing status'),
      { status: 500 }
    );
  }
}
