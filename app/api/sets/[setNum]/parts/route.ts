import { NextRequest, NextResponse } from 'next/server';
import { createRebrickableClient } from '@/rebrickable/client';
import { mapPart } from '@/rebrickable/mappers';

export async function GET(
  request: NextRequest,
  { params }: { params: { setNum: string } }
) {
  try {
    const { setNum } = params;

    if (!setNum) {
      return NextResponse.json(
        { error: 'Set number is required' },
        { status: 400 }
      );
    }

    // Create client and fetch parts from Rebrickable
    const client = createRebrickableClient();
    const response = await client.getSetParts(setNum, 1, 1000); // Get all parts

    // Map to simplified DTOs
    const parts = response.results.map(mapPart);

    // Return response with caching headers
    return NextResponse.json(
      {
        count: response.count,
        parts,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching set parts:', error);

    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes('REBRICKABLE_API_KEY')) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch set parts' },
      { status: 500 }
    );
  }
}

