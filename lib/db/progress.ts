// Server-side database functions for progress
// TEMPORARILY DISABLED: Prisma has been removed - returns safe fallbacks

import type { SetDetail } from '@/rebrickable/types';

export interface ProgressData {
  setNum: string;
  partNum: string;
  colorId: number;
  isSpare: boolean;
  neededQty: number;
  foundQty: number;
}

/**
 * Get all progress records for a user's set
 * TEMPORARILY DISABLED: Returns empty array since Prisma is disabled
 * Multi-device sync is temporarily disabled - app runs in offline/Dexie-only mode
 */
export async function getUserProgress(userId: string, setNum: string) {
  // Return empty array - progress is stored locally in Dexie only
  return [];
}

/**
 * Save or update progress records for a set
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 * Progress is stored locally in Dexie only
 */
export async function saveProgressToDB(userId: string, progressData: ProgressData) {
  // No-op - progress is stored locally in Dexie only
  // Multi-device sync is temporarily disabled
}

/**
 * Bulk save progress records for a set
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 */
export async function bulkSaveProgressToDB(userId: string, progressArray: ProgressData[]) {
  // No-op - progress is stored locally in Dexie only
  // Multi-device sync is temporarily disabled
}
