// API route to sync sets from database to client
// GET /api/sets/sync - Returns all sets for the authenticated user

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserSets } from '@/lib/db/sets';
import { ensureUser } from '@/lib/db/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ensure user exists in database
    await ensureUser(
      session.user.id,
      session.user.email,
      session.user.name,
      session.user.image
    );

    const sets = await getUserSets(session.user.id);

    return NextResponse.json({ sets });
  } catch (error) {
    console.error('Error syncing sets:', error);
    return NextResponse.json(
      { error: 'Failed to sync sets' },
      { status: 500 }
    );
  }
}

