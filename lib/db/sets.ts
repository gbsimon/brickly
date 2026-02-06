// Server-side database functions for sets
// TEMPORARILY DISABLED: Prisma has been removed - returns safe fallbacks

import type { SetDetail } from '@/rebrickable/types';

/**
 * Get all sets for a user from the database
 * TEMPORARILY DISABLED: Returns empty array since Prisma is disabled
 * Multi-device sync is temporarily disabled - app runs in offline/Dexie-only mode
 */
export async function getUserSets(userId: string) {
  // Return empty array - sets are stored locally in Dexie only
  return [];
}

/**
 * Add a set to the database for a user
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 * Sets are stored locally in Dexie only
 */
export async function addSetToDB(userId: string, set: SetDetail) {
  // No-op - sets are stored locally in Dexie only
  // Multi-device sync is temporarily disabled
}

/**
 * Remove a set from the database for a user
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 */
export async function removeSetFromDB(userId: string, setNum: string) {
  // No-op - sets are stored locally in Dexie only
}

/**
 * Update the lastOpenedAt timestamp for a set
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 */
export async function updateSetLastOpened(userId: string, setNum: string) {
  // No-op - sets are stored locally in Dexie only
}

/**
 * Toggle the ongoing status of a set
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 */
export async function toggleSetOngoing(userId: string, setNum: string, isOngoing: boolean) {
  // No-op - sets are stored locally in Dexie only
}

/**
 * Toggle the hidden status of a set
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 */
export async function toggleSetHidden(userId: string, setNum: string, isHidden: boolean) {
  // No-op - sets are stored locally in Dexie only
}

/**
 * Update theme name for a set
 * TEMPORARILY DISABLED: No-op since Prisma is disabled
 */
export async function updateSetThemeNames(userId: string, setNum: string, themeName: string) {
  // No-op - sets are stored locally in Dexie only
}
