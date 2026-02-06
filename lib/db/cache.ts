// Server-side cache helpers for Rebrickable data (global, not user-specific)
// TEMPORARILY DISABLED: Prisma has been removed - returns safe fallbacks

import type { SetDetail, SetPart, SetMinifig } from '@/rebrickable/types';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get cached set data
 * TEMPORARILY DISABLED: Returns null since Prisma is disabled
 * Cache is stored locally in Dexie only
 */
export async function getCachedSet(
  setNum: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<SetDetail | null> {
  // Return null - cache is stored locally in Dexie only
  return null;
}

/**
 * Upsert cached set data
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 */
export async function upsertCachedSet(setNum: string, data: SetDetail) {
  // No-op - cache is stored locally in Dexie only
}

/**
 * Get cached inventory data
 * TEMPORARILY DISABLED: Returns null since Prisma is disabled
 */
export async function getCachedInventory(
  setNum: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<{ parts: SetPart[]; minifigs: SetMinifig[] } | null> {
  // Return null - cache is stored locally in Dexie only
  return null;
}

/**
 * Upsert cached inventory data
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 */
export async function upsertCachedInventory(
  setNum: string,
  parts: SetPart[],
  minifigs: SetMinifig[]
) {
  // No-op - cache is stored locally in Dexie only
}

export function getCacheTtlMs() {
  return DEFAULT_TTL_MS;
}
