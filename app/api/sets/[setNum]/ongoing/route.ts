// API route to toggle ongoing status for a set
// PATCH /api/sets/[setNum]/ongoing

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { toggleSetOngoing } from '@/lib/db/sets';
import { ensureUser } from '@/lib/db/users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
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
    const { isOngoing } = body;

    if (typeof isOngoing !== 'boolean') {
      return NextResponse.json(
        { error: 'isOngoing must be a boolean' },
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

    await toggleSetOngoing(user.id, setNum, isOngoing);

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
