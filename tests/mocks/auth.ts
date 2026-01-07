// Mock for NextAuth auth function
export const mockAuth = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg',
  },
};

export function createMockAuth(overrides?: Partial<typeof mockAuth>) {
  return {
    ...mockAuth,
    ...overrides,
  };
}

