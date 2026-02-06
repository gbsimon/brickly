// API route for progress operations
// GET /api/sets/[setNum]/progress - Get all progress for a set
// POST /api/sets/[setNum]/progress - Save progress for a set

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserProgress, saveProgressToDB, bulkSaveProgressToDB } from '@/lib/db/progress';
import { ensureUser } from '@/lib/db/users';
import { addSetToDB } from '@/lib/db/sets';
// TEMPORARILY DISABLED: Prisma import removed - app runs in offline/Dexie-only mode
import { createRebrickableClient } from '@/rebrickable/client';
import { mapSetDetail } from '@/rebrickable/mappers';
import { createLogger, createErrorResponse } from '@/lib/logger';
import type { ProgressData } from '@/lib/db/progress';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  const logger = createLogger(request);
  
  try {
    const session = await auth();

    if (!session?.user?.id) {
      logger.warn('Unauthorized request to get progress');
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

    userLogger.info('Fetching progress', { setNum });
    const progress = await getUserProgress(user.id, setNum);
    userLogger.logRequest(200, { setNum, progressCount: progress.length });

    return NextResponse.json({ progress });
  } catch (err: any) {
    logger.error('Failed to get progress', err);
    return NextResponse.json(
      createErrorResponse(err, 'Failed to get progress'),
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  const logger = createLogger(request);
  
  try {
    const session = await auth();

    if (!session?.user?.id) {
      logger.warn('Unauthorized request to save progress');
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
    
    // Ensure user exists first
    const user = await ensureUser(
      session.user.id,
      session.user.email,
      session.user.name,
      session.user.image
    );
    const userLogger = logger.child({ userId: user.id });

    // TEMPORARILY DISABLED: Prisma is disabled - skip set existence check
    // Sets are stored locally in Dexie only - multi-device sync is disabled

    // Support both single progress item and array
    if (Array.isArray(body)) {
      // Bulk save
      const progressArray: ProgressData[] = body.map((item) => ({
        setNum,
        partNum: item.partNum,
        colorId: item.colorId,
        isSpare: item.isSpare || false,
        neededQty: item.neededQty,
        foundQty: item.foundQty,
      }));

      userLogger.info('Bulk saving progress', { setNum, count: progressArray.length });
      await bulkSaveProgressToDB(user.id, progressArray);
      userLogger.logRequest(200, { setNum, operation: 'bulk', count: progressArray.length });
    } else {
      // Single save
      const progressData: ProgressData = {
        setNum,
        partNum: body.partNum,
        colorId: body.colorId,
        isSpare: body.isSpare || false,
        neededQty: body.neededQty,
        foundQty: body.foundQty,
      };

      // Validate required fields
      if (!progressData.partNum || progressData.colorId === undefined || progressData.neededQty === undefined || progressData.foundQty === undefined) {
        userLogger.warn('Invalid progress data', { 
          setNum,
          received: {
            partNum: progressData.partNum,
            colorId: progressData.colorId,
            neededQty: progressData.neededQty,
            foundQty: progressData.foundQty,
          }
        });
        return NextResponse.json(
          {
            ok: false,
            message: 'Missing required fields: partNum, colorId, neededQty, foundQty',
            code: 'VALIDATION_ERROR',
            received: {
              partNum: progressData.partNum,
              colorId: progressData.colorId,
              neededQty: progressData.neededQty,
              foundQty: progressData.foundQty,
            },
          },
          { status: 400 }
        );
      }

      userLogger.info('Saving progress', { setNum, partNum: progressData.partNum, colorId: progressData.colorId });
      await saveProgressToDB(user.id, progressData);
      userLogger.logRequest(200, { setNum, operation: 'single', partNum: progressData.partNum });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to save progress', err);
    return NextResponse.json(
      createErrorResponse(err, 'Failed to save progress'),
      { status: 500 }
    );
  }
}
