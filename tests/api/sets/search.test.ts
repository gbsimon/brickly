import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/sets/search/route';
import { NextRequest } from 'next/server';
import { createRebrickableClient } from '@/rebrickable/client';
import { mockSetSearchResponse } from '../../mocks/rebrickable';

// Mock the Rebrickable client
vi.mock('@/rebrickable/client', () => ({
  createRebrickableClient: vi.fn(),
}));

describe('GET /api/sets/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return search results for valid query', async () => {
    const mockClient = {
      searchSets: vi.fn().mockResolvedValue(mockSetSearchResponse),
    };
    vi.mocked(createRebrickableClient).mockReturnValue(mockClient as any);

    const url = new URL('http://localhost/api/sets/search?q=test&page=1&page_size=20');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].setNum).toBe('21322-1');
    expect(data.results[0].name).toBe('Test Set 1');
    expect(mockClient.searchSets).toHaveBeenCalledWith('test', 1, 20);
  });

  it('should return error for invalid page (< 1)', async () => {
    const url = new URL('http://localhost/api/sets/search?q=test&page=0');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.message).toContain('Page must be >= 1');
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('should return error for invalid pageSize (> 100)', async () => {
    const url = new URL('http://localhost/api/sets/search?q=test&page_size=101');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.message).toContain('Page size must be between 1 and 100');
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('should handle empty query', async () => {
    const mockClient = {
      searchSets: vi.fn().mockResolvedValue({ ...mockSetSearchResponse, count: 0, results: [] }),
    };
    vi.mocked(createRebrickableClient).mockReturnValue(mockClient as any);

    const url = new URL('http://localhost/api/sets/search');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
    expect(data.results).toHaveLength(0);
    expect(mockClient.searchSets).toHaveBeenCalledWith('', 1, 20);
  });

  it('should handle API errors gracefully', async () => {
    const mockClient = {
      searchSets: vi.fn().mockRejectedValue(new Error('API Error')),
    };
    vi.mocked(createRebrickableClient).mockReturnValue(mockClient as any);

    const url = new URL('http://localhost/api/sets/search?q=test');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.message).toBe('Failed to search sets');
  });
});
