// API route to delete a set
// DELETE /api/sets/[setNum]/delete

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { removeSetFromDB } from '@/lib/db/sets';

export const dynamic = 'force-dynamic';

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

