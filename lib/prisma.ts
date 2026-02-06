// Prisma client singleton for Next.js
// TEMPORARILY DISABLED: Prisma has been removed to unblock Railway builds
// This file exists to prevent import errors, but Prisma is not initialized

export const prisma = null as any // eslint-disable-line

// Note: All Prisma operations have been replaced with safe fallbacks
// See lib/db/* files for fallback implementations
// Multi-device sync is temporarily disabled - app runs in offline/Dexie-only mode
