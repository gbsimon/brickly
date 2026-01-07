import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/sets/route';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { ensureUser } from '@/lib/db/users';
import { addSetToDB } from '@/lib/db/sets';
import { mockAuth } from '../../mocks/auth';

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db/users', () => ({
  ensureUser: vi.fn(),
}));

vi.mock('@/lib/db/sets', () => ({
  addSetToDB: vi.fn(),
}));

describe('POST /api/sets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a set to library successfully', async () => {
    const mockUser = { id: 'test-user-id' };
    const mockSet = {
      setNum: '21322-1',
      name: 'Test Set',
      year: 2020,
      numParts: 100,
      imageUrl: 'https://example.com/set.jpg',
      themeId: 1,
    };

    vi.mocked(auth).mockResolvedValue(mockAuth as any);
    vi.mocked(ensureUser).mockResolvedValue(mockUser as any);
    vi.mocked(addSetToDB).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/sets', {
      method: 'POST',
      body: JSON.stringify(mockSet),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(ensureUser).toHaveBeenCalledWith(
      mockAuth.user.id,
      mockAuth.user.email,
      mockAuth.user.name,
      mockAuth.user.image
    );
    expect(addSetToDB).toHaveBeenCalledWith(mockUser.id, mockSet);
  });

  it('should return 401 for unauthorized requests', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const mockSet = {
      setNum: '21322-1',
      name: 'Test Set',
    };

    const request = new NextRequest('http://localhost/api/sets', {
      method: 'POST',
      body: JSON.stringify(mockSet),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(addSetToDB).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid set data (missing setNum)', async () => {
    const mockUser = { id: 'test-user-id' };

    vi.mocked(auth).mockResolvedValue(mockAuth as any);
    vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

    const invalidSet = {
      name: 'Test Set',
      // missing setNum
    };

    const request = new NextRequest('http://localhost/api/sets', {
      method: 'POST',
      body: JSON.stringify(invalidSet),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid set data');
    expect(addSetToDB).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid set data (missing name)', async () => {
    const mockUser = { id: 'test-user-id' };

    vi.mocked(auth).mockResolvedValue(mockAuth as any);
    vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

    const invalidSet = {
      setNum: '21322-1',
      // missing name
    };

    const request = new NextRequest('http://localhost/api/sets', {
      method: 'POST',
      body: JSON.stringify(invalidSet),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid set data');
    expect(addSetToDB).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const mockUser = { id: 'test-user-id' };
    const mockSet = {
      setNum: '21322-1',
      name: 'Test Set',
    };

    vi.mocked(auth).mockResolvedValue(mockAuth as any);
    vi.mocked(ensureUser).mockResolvedValue(mockUser as any);
    vi.mocked(addSetToDB).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/sets', {
      method: 'POST',
      body: JSON.stringify(mockSet),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.message).toBe('Failed to add set');
  });
});
