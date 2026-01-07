import { NextRequest, NextResponse } from 'next/server';
import { createRebrickableClient } from '@/rebrickable/client';
import { mapSetToSearchResult } from '@/rebrickable/mappers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

    // Validate inputs
    if (page < 1) {
      return NextResponse.json(
        { error: 'Page must be >= 1' },
        { status: 400 }
      );
    }

    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Page size must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Create client and fetch from Rebrickable
    const client = createRebrickableClient();
    const response = await client.searchSets(query, page, pageSize);

    // Map to simplified DTOs
    const results = response.results.map(mapSetToSearchResult);

    // Return response with caching headers
    return NextResponse.json(
      {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error searching sets:', error);

    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes('REBRICKABLE_API_KEY')) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search sets' },
      { status: 500 }
    );
  }
}

