// API route for progress operations
// GET /api/sets/[setNum]/progress - Get all progress for a set
// POST /api/sets/[setNum]/progress - Save progress for a set

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserProgress, saveProgressToDB, bulkSaveProgressToDB } from '@/lib/db/progress';
import { ensureUser } from '@/lib/db/users';
import { addSetToDB } from '@/lib/db/sets';
import { prisma } from '@/lib/prisma';
import { createRebrickableClient } from '@/rebrickable/client';
import { mapSetDetail } from '@/rebrickable/mappers';
import type { ProgressData } from '@/lib/db/progress';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { setNum } = await params;

    if (!setNum) {
      return NextResponse.json(
        { error: 'Set number is required' },
        { status: 400 }
      );
    }

    const user = await ensureUser(
      session.user.id,
      session.user.email,
      session.user.name,
      session.user.image
    );

    const progress = await getUserProgress(user.id, setNum);

    return NextResponse.json({ progress });
  } catch (err: any) {
    console.error('SETS_API_ERROR', err);
    return NextResponse.json(
      {
        ok: false,
        message: err?.message,
        code: err?.code,
        meta: err?.meta,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { setNum } = await params;

    if (!setNum) {
      return NextResponse.json(
        { error: 'Set number is required' },
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

    // Ensure set exists in database (required for foreign key constraint)
    // Check if set exists, if not, fetch from Rebrickable and create it
    const existingSet = await prisma.set.findUnique({
      where: {
        userId_setNum: {
          userId: user.id,
          setNum,
        },
      },
    });

    if (!existingSet) {
      // Set doesn't exist, fetch from Rebrickable and create it
      try {
        const client = createRebrickableClient();
        const rebrickableSet = await client.getSet(setNum);
        const setDetail = mapSetDetail(rebrickableSet);
        await addSetToDB(user.id, setDetail);
      } catch (setError: any) {
        console.error('[PROGRESS_POST] Failed to fetch/create set:', {
          setNum,
          error: setError?.message,
        });
        // Continue anyway - the progress save might still work if set was just created
      }
    }

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

      await bulkSaveProgressToDB(user.id, progressArray);
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
        return NextResponse.json(
          {
            ok: false,
            message: 'Missing required fields: partNum, colorId, neededQty, foundQty',
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

      await saveProgressToDB(user.id, progressData);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PROGRESS_POST] SETS_API_ERROR', {
      message: err?.message,
      code: err?.code,
      name: err?.name,
      meta: err?.meta,
      stack: err?.stack,
    });
    return NextResponse.json(
      {
        ok: false,
        message: err?.message || 'Internal server error',
        code: err?.code,
        meta: err?.meta,
        name: err?.name,
      },
      { status: 500 }
    );
  }
}
