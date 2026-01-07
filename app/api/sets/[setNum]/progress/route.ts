// API route for progress operations
// GET /api/sets/[setNum]/progress - Get all progress for a set
// POST /api/sets/[setNum]/progress - Save progress for a set

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserProgress, saveProgressToDB, bulkSaveProgressToDB } from '@/lib/db/progress';
import type { ProgressData } from '@/lib/db/progress';

export const dynamic = 'force-dynamic';

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

    const progress = await getUserProgress(session.user.id, setNum);

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
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

      await bulkSaveProgressToDB(session.user.id, progressArray);
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

      await saveProgressToDB(session.user.id, progressData);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}

