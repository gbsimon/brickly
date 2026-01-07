// API route for progress operations
// GET /api/sets/[setNum]/progress - Get all progress for a set
// POST /api/sets/[setNum]/progress - Save progress for a set

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserProgress, saveProgressToDB, bulkSaveProgressToDB } from '@/lib/db/progress';
import { ensureUser } from '@/lib/db/users';
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

      const user = await ensureUser(
        session.user.id,
        session.user.email,
        session.user.name,
        session.user.image
      );

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

      const user = await ensureUser(
        session.user.id,
        session.user.email,
        session.user.name,
        session.user.image
      );

      await saveProgressToDB(user.id, progressData);
    }

    return NextResponse.json({ success: true });
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
