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
  } catch (error) {
    console.error('Error syncing sets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : undefined;
    console.error('Error details:', { 
      errorMessage, 
      errorStack, 
      errorName,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPrismaDatabaseUrl: !!process.env.PRISMA_DATABASE_URL,
    });
    
    // Return error details in production too for debugging (can remove later)
    return NextResponse.json(
      { 
        error: 'Failed to sync sets', 
        details: errorMessage,
        name: errorName,
      },
      { status: 500 }
    );
  }
}

