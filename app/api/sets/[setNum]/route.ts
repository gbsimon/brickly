import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createRebrickableClient } from '@/rebrickable/client';
import { mapSetDetail } from '@/rebrickable/mappers';
import { removeSetFromDB } from '@/lib/db/sets';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setNum: string }> }
) {
  try {
    const { setNum } = await params;

    if (!setNum) {
      return NextResponse.json(
        { error: 'Set number is required' },
        { status: 400 }
      );
    }

    // Create client and fetch set details from Rebrickable
    const client = createRebrickableClient();
    const set = await client.getSet(setNum);

    // Map to simplified DTO
    const setDetail = mapSetDetail(set);

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
  } catch (error) {
    console.error('Error fetching set:', error);

    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes('REBRICKABLE_API_KEY')) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch set' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await removeSetFromDB(session.user.id, setNum);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing set:', error);
    return NextResponse.json(
      { error: 'Failed to remove set' },
      { status: 500 }
    );
  }
}

