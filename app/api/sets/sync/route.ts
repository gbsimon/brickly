// API route to sync sets from database to client
// GET /api/sets/sync - Returns all sets for the authenticated user

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserSets } from '@/lib/db/sets';
import { ensureUser } from '@/lib/db/users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Test database connection first
    try {
      // Ensure user exists in database
      await ensureUser(
        session.user.id,
        session.user.email,
        session.user.name,
        session.user.image
      );
    } catch (dbError) {
      console.error('Database connection error in ensureUser:', dbError);
      throw dbError;
    }

    const sets = await getUserSets(session.user.id);

    return NextResponse.json({ sets });
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

