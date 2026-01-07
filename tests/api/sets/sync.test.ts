import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/sets/sync/route';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { ensureUser } from '@/lib/db/users';
import { getUserSets } from '@/lib/db/sets';
import { mockAuth } from '../../mocks/auth';

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db/users', () => ({
  ensureUser: vi.fn(),
}));

vi.mock('@/lib/db/sets', () => ({
  getUserSets: vi.fn(),
}));

describe('GET /api/sets/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync sets successfully', async () => {
    const mockUser = { id: 'test-user-id' };
    const mockSets = [
      {
        setNum: '21322-1',
        name: 'Test Set 1',
        year: 2020,
        numParts: 100,
        imageUrl: 'https://example.com/set1.jpg',
        themeId: 1,
        isOngoing: false,
        addedAt: new Date('2024-01-01'),
        lastOpenedAt: new Date('2024-01-01'),
      },
      {
        setNum: '21323-1',
        name: 'Test Set 2',
        year: 2021,
        numParts: 200,
        imageUrl: 'https://example.com/set2.jpg',
        themeId: 1,
        isOngoing: true,
        addedAt: new Date('2024-01-02'),
        lastOpenedAt: new Date('2024-01-02'),
      },
    ];

    vi.mocked(auth).mockResolvedValue(mockAuth as any);
    vi.mocked(ensureUser).mockResolvedValue(mockUser as any);
    vi.mocked(getUserSets).mockResolvedValue(mockSets as any);

    const request = new NextRequest('http://localhost/api/sets/sync');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sets).toHaveLength(2);
    expect(data.sets[0].setNum).toBe('21322-1');
    expect(data.sets[1].setNum).toBe('21323-1');
    expect(getUserSets).toHaveBeenCalledWith(mockUser.id);
  });

  it('should return empty array when user has no sets', async () => {
    const mockUser = { id: 'test-user-id' };

    vi.mocked(auth).mockResolvedValue(mockAuth as any);
    vi.mocked(ensureUser).mockResolvedValue(mockUser as any);
    vi.mocked(getUserSets).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/sets/sync');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sets).toHaveLength(0);
    expect(getUserSets).toHaveBeenCalledWith(mockUser.id);
  });

  it('should return 401 for unauthorized requests', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new NextRequest('http://localhost/api/sets/sync');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(data.message).toBe('Unauthorized');
    expect(getUserSets).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    const mockUser = { id: 'test-user-id' };

    vi.mocked(auth).mockResolvedValue(mockAuth as any);
    vi.mocked(ensureUser).mockResolvedValue(mockUser as any);
    vi.mocked(getUserSets).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/sets/sync');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.message).toBe('Failed to sync sets');
  });
});
