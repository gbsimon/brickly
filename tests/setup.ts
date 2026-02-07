// Test setup file
// This file runs before all tests

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.AUTH_GOOGLE_ID = 'test-google-id';
process.env.AUTH_GOOGLE_SECRET = 'test-google-secret';
process.env.REBRICKABLE_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Suppress console logs in tests (optional - comment out if you want to see logs)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };
