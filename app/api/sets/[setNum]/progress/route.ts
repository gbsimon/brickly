// API route for progress operations
// GET /api/sets/[setNum]/progress - Get all progress for a set
// POST /api/sets/[setNum]/progress - Save progress for a set

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserProgress, saveProgressToDB, bulkSaveProgressToDB } from '@/lib/db/progress';
import { ensureUser } from '@/lib/db/users';
import { addSetToDB, getUserSet } from '@/lib/db/sets';
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

    // Ensure set exists in database (required for foreign key constraint)
    // Check if set exists, if not, fetch from Rebrickable and create it
    const existingSet = await getUserSet(user.id, setNum);

    if (!existingSet) {
      // Set doesn't exist, fetch from Rebrickable and create it
      try {
        userLogger.info('Set not found, fetching from Rebrickable', { setNum });
        const client = createRebrickableClient();
        const rebrickableSet = await client.getSet(setNum);
        const setDetail = mapSetDetail(rebrickableSet);
        await addSetToDB(user.id, setDetail);
        userLogger.info('Set created from Rebrickable', { setNum });
      } catch (setError: any) {
        userLogger.warn('Failed to fetch/create set', {
          setNum,
          error: {
            name: setError?.name,
            message: setError?.message,
            code: setError?.code,
          },
        });
        // Continue anyway - the progress save might still work if set was just created
      }
    }

    // Support both single progress item and array
    if (Array.isArray(body)) {
      const isZeroInit = body.every((item) => Number(item?.foundQty ?? 0) === 0)
        && body.every((item) => item?.updatedAt === undefined);
      if (isZeroInit) {
        const existingProgress = await getUserProgress(user.id, setNum);
        if (existingProgress.length > 0) {
          userLogger.info('Skipping bulk zero init (progress already exists)', {
            setNum,
            existingCount: existingProgress.length,
          });
          return NextResponse.json({ success: true, skipped: true });
        }
      }

      // Bulk save
      const progressArray: ProgressData[] = body.map((item) => ({
        setNum,
        partNum: item.partNum,
        colorId: item.colorId,
        isSpare: item.isSpare || false,
        neededQty: item.neededQty,
        foundQty: item.foundQty,
        updatedAt: item.updatedAt,
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
        updatedAt: body.updatedAt,
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
