// Prisma client singleton for Next.js
// TEMPORARILY DISABLED: Prisma has been removed to unblock Railway builds
// This file exists to prevent import errors, but Prisma is not initialized

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = null

// Note: All Prisma operations have been replaced with safe fallbacks
// See lib/db/* files for fallback implementations
// Multi-device sync is temporarily disabled - app runs in offline/Dexie-only mode
