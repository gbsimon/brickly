// Database query helpers

import { db } from './database';
import type { SetRecord, InventoryRecord, ProgressRecord } from './types';
import type { SetDetail, SetPart, SetMinifig } from '@/rebrickable/types';
import { queueSyncOperation, replaySyncQueue } from './sync-queue';
import { logClientError, createContextLogger } from '@/lib/client-logger';

/**
 * Sets operations
 */
export async function addSet(set: SetDetail): Promise<void> {
  const now = Date.now();
  
  // Write to IndexedDB (local cache)
  await db.sets.put({
    setNum: set.setNum,
    name: set.name,
    year: set.year,
    numParts: set.numParts,
    imageUrl: set.imageUrl,
    themeId: set.themeId,
    themeName: set.themeName,
    isOngoing: false, // New sets default to not ongoing
    addedAt: now,
    lastOpenedAt: now,
  });

  // Sync to database (server-side)
  try {
    const response = await fetch('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(set),
    });
    if (!response.ok) {
      throw new Error(`Failed to sync set: ${response.statusText}`);
    }
  } catch (error) {
    const logger = createContextLogger({ lastAction: 'addSet', setNum: set.setNum });
    logger.error(error instanceof Error ? error : new Error(String(error)), { setNum: set.setNum });
    // Queue for retry when online
    await queueSyncOperation('addSet', set);
  }
}

export async function getSet(setNum: string): Promise<SetRecord | undefined> {
  return db.sets.get(setNum);
}

export async function getAllSets(): Promise<SetRecord[]> {
  return db.sets.orderBy('lastOpenedAt').reverse().toArray();
}

/**
 * Sync sets from database to IndexedDB
 * Called on login to load user's library from the database
 */
export async function syncSetsFromDB(): Promise<void> {
  try {
    const response = await fetch('/api/sets/sync');
    
    if (!response.ok) {
      // Try to get error details from response
      let errorDetails = 'Failed to sync sets from database';
      try {
        const errorData = await response.json();
        errorDetails = errorData.details || errorData.error || errorDetails;
        console.error('Sync error details:', errorData);
      } catch (e) {
        // If response isn't JSON, use status text
        errorDetails = response.statusText || errorDetails;
      }
      throw new Error(errorDetails);
    }

    const { sets } = await response.json();

    // Clear existing sets and bulk add synced sets
    await db.sets.clear();
    
    if (sets.length > 0) {
      const setRecords: SetRecord[] = sets.map((set: any) => ({
        setNum: set.setNum,
        name: set.name,
        year: set.year,
        numParts: set.numParts,
        imageUrl: set.imageUrl,
        themeId: set.themeId,
        themeName: set.themeName,
        isOngoing: set.isOngoing ?? false, // Default to false if not present
        addedAt: set.addedAt,
        lastOpenedAt: set.lastOpenedAt,
      }));

      await db.sets.bulkPut(setRecords);
    }

    // After syncing sets, replay any pending sync queue operations
    await replaySyncQueue();
  } catch (error) {
    const logger = createContextLogger({ lastAction: 'syncSetsFromDB' });
    logger.error(error instanceof Error ? error : new Error(String(error)));
    // Continue with local cache if sync fails
  }
}

export async function updateSetLastOpened(setNum: string): Promise<void> {
  await db.sets.update(setNum, {
    lastOpenedAt: Date.now(),
  });
}

/**
 * Toggle the ongoing status of a set
 */
export async function toggleSetOngoing(setNum: string, isOngoing: boolean): Promise<void> {
  // Update IndexedDB (local cache)
  await db.sets.update(setNum, {
    isOngoing,
  });

  // Sync to database (server-side)
  try {
    const response = await fetch(`/api/sets/${setNum}/ongoing`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOngoing }),
    });
    if (!response.ok) {
      throw new Error(`Failed to sync ongoing status: ${response.statusText}`);
    }
  } catch (error) {
    const logger = createContextLogger({ lastAction: 'toggleSetOngoing', setNum });
    logger.error(error instanceof Error ? error : new Error(String(error)), { setNum, isOngoing });
    // Queue for retry when online
    await queueSyncOperation('toggleOngoing', { setNum, isOngoing });
  }
}

export async function removeSet(setNum: string): Promise<void> {
  // Remove from IndexedDB (local cache)
  await Promise.all([
    db.sets.delete(setNum),
    db.inventories.delete(setNum),
    db.progress.where('setNum').equals(setNum).delete(),
  ]);

  // Sync to database (server-side)
  try {
    const response = await fetch(`/api/sets/${setNum}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to sync set removal: ${response.statusText}`);
    }
  } catch (error) {
    const logger = createContextLogger({ lastAction: 'removeSet', setNum });
    logger.error(error instanceof Error ? error : new Error(String(error)), { setNum });
    // Queue for retry when online
    await queueSyncOperation('removeSet', { setNum });
  }
}

/**
 * Inventory operations
 */
export async function saveInventory(
  setNum: string,
  parts: SetPart[],
  minifigs: SetMinifig[] = []
): Promise<void> {
  await db.inventories.put({
    setNum,
    parts: parts.map((part) => ({
      partNum: part.partNum,
      partName: part.partName,
      colorId: part.colorId,
      colorName: part.colorName,
      quantity: part.quantity,
      imageUrl: part.imageUrl,
      isSpare: part.isSpare,
      isMinifig: part.isMinifig,
    })),
    minifigs,
    fetchedAt: Date.now(),
  });
}

export async function getInventory(
  setNum: string
): Promise<InventoryRecord | undefined> {
  return db.inventories.get(setNum);
}

/**
 * Progress operations
 */
export function createProgressId(
  setNum: string,
  partNum: string,
  colorId: number,
  isSpare: boolean = false
): string {
  return `${setNum}-${partNum}-${colorId}-${isSpare ? 'spare' : 'regular'}`;
}

export async function initializeProgress(
  setNum: string,
  parts: SetPart[]
): Promise<void> {
  const now = Date.now();
  const progressRecords: ProgressRecord[] = parts.map((part) => ({
    id: createProgressId(setNum, part.partNum, part.colorId, part.isSpare),
    setNum,
    partNum: part.partNum,
    colorId: part.colorId,
    neededQty: part.quantity,
    foundQty: 0,
    updatedAt: now,
  }));

  await db.progress.bulkPut(progressRecords);

  // Sync initial progress to database (server-side)
  try {
    const progressData = parts.map((part) => ({
      partNum: part.partNum,
      colorId: part.colorId,
      isSpare: part.isSpare,
      neededQty: part.quantity,
      foundQty: 0,
    }));

    const response = await fetch(`/api/sets/${setNum}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressData),
    });
    if (!response.ok) {
      throw new Error(`Failed to sync initial progress: ${response.statusText}`);
    }
  } catch (error) {
    const logger = createContextLogger({ lastAction: 'initializeProgress', setNum });
    logger.error(error instanceof Error ? error : new Error(String(error)), { setNum, partsCount: parts.length });
    // Queue for retry when online
    const progressData = parts.map((part) => ({
      partNum: part.partNum,
      colorId: part.colorId,
      isSpare: part.isSpare,
      neededQty: part.quantity,
      foundQty: 0,
    }));
    await queueSyncOperation('bulkUpdateProgress', {
      setNum,
      progressArray: progressData,
    });
  }
}

export async function updateProgress(
  setNum: string,
  partNum: string,
  colorId: number,
  foundQty: number,
  isSpare: boolean = false
): Promise<void> {
  const id = createProgressId(setNum, partNum, colorId, isSpare);
  
  // Get existing record or create new one
  const existing = await db.progress.get(id);
  
  let neededQty: number;
  
  if (existing) {
    neededQty = existing.neededQty;
    await db.progress.update(id, {
      foundQty: Math.max(0, foundQty), // Ensure non-negative
      updatedAt: Date.now(),
    });
  } else {
    // If progress doesn't exist, we need the neededQty from inventory
    const inventory = await getInventory(setNum);
    const part = inventory?.parts.find(
      (p) => p.partNum === partNum && p.colorId === colorId && p.isSpare === isSpare
    );
    
    if (part) {
      neededQty = part.quantity;
      await db.progress.put({
        id,
        setNum,
        partNum,
        colorId,
        neededQty,
        foundQty: Math.max(0, foundQty),
        updatedAt: Date.now(),
      });
    } else {
      // Can't create progress without inventory data
      return;
    }
  }

  // Sync to database (server-side)
  try {
    const response = await fetch(`/api/sets/${setNum}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partNum,
        colorId,
        isSpare,
        neededQty,
        foundQty: Math.max(0, foundQty),
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to sync progress: ${response.statusText}`);
    }
  } catch (error) {
    const logger = createContextLogger({ lastAction: 'updateProgress', setNum });
    logger.error(error instanceof Error ? error : new Error(String(error)), { setNum, partNum, colorId });
    // Queue for retry when online
    await queueSyncOperation('updateProgress', {
      setNum,
      partNum,
      colorId,
      isSpare,
      neededQty,
      foundQty: Math.max(0, foundQty),
    });
  }
}

export async function getProgressForSet(
  setNum: string
): Promise<ProgressRecord[]> {
  return db.progress.where('setNum').equals(setNum).toArray();
}

/**
 * Sync progress from database to IndexedDB with conflict resolution (last-write-wins)
 * Called when opening a set to load progress from the database
 */
export async function syncProgressFromDB(setNum: string): Promise<void> {
  try {
    const response = await fetch(`/api/sets/${setNum}/progress`);
    
    if (!response.ok) {
      throw new Error('Failed to sync progress from database');
    }

    const { progress } = await response.json();

    if (!progress || progress.length === 0) {
      // No progress in DB, keep local cache
      return;
    }

    // Get existing local progress for conflict resolution
    const localProgress = await getProgressForSet(setNum);
    const localProgressMap = new Map(
      localProgress.map((p) => [p.id, p])
    );

    // Merge server progress with local progress using last-write-wins
    const mergedProgress: ProgressRecord[] = progress.map((p: any) => {
      const id = createProgressId(setNum, p.partNum, p.colorId, p.isSpare);
      const localRecord = localProgressMap.get(id);
      
      // Convert server updatedAt (DateTime) to timestamp
      const serverUpdatedAt = typeof p.updatedAt === 'string' 
        ? new Date(p.updatedAt).getTime()
        : p.updatedAt instanceof Date
        ? p.updatedAt.getTime()
        : p.updatedAt;

      // Last-write-wins: use the record with the most recent updatedAt
      if (localRecord && localRecord.updatedAt > serverUpdatedAt) {
        // Local is newer, keep local
        return localRecord;
      } else {
        // Server is newer or equal, use server
        return {
          id,
          setNum,
          partNum: p.partNum,
          colorId: p.colorId,
          neededQty: p.neededQty,
          foundQty: p.foundQty,
          updatedAt: serverUpdatedAt,
        };
      }
    });

    // Add any local-only progress records (not in server response)
    for (const localRecord of localProgress) {
      if (!mergedProgress.find((p) => p.id === localRecord.id)) {
        mergedProgress.push(localRecord);
      }
    }

    // Clear existing progress for this set and bulk add merged progress
    await db.progress.where('setNum').equals(setNum).delete();
    await db.progress.bulkPut(mergedProgress);

    // After syncing progress, replay any pending sync queue operations
    await replaySyncQueue();
  } catch (error) {
    const logger = createContextLogger({ lastAction: 'syncProgressFromDB', setNum });
    logger.error(error instanceof Error ? error : new Error(String(error)));
    // Continue with local cache if sync fails
  }
}

export async function getProgress(
  setNum: string,
  partNum: string,
  colorId: number,
  isSpare: boolean = false
): Promise<ProgressRecord | undefined> {
  const id = createProgressId(setNum, partNum, colorId, isSpare);
  return db.progress.get(id);
}

/**
 * Utility: Get progress summary for a set
 * Excludes spare parts from the count to match Rebrickable's total quantity
 */
export async function getProgressSummary(setNum: string): Promise<{
  totalParts: number;
  foundParts: number;
  completionPercentage: number;
}> {
  const inventory = await getInventory(setNum);
  const progress = await getProgressForSet(setNum);
  
  // Calculate total from inventory (excluding spares) to match Rebrickable
  let totalParts = 0;
  let foundParts = 0;
  
  if (inventory) {
    // Sum quantities from inventory, excluding spares
    inventory.parts.forEach((part) => {
      if (!part.isSpare) {
        totalParts += part.quantity;
        
        // Find matching progress record
        const progressId = createProgressId(setNum, part.partNum, part.colorId, false);
        const progressRecord = progress.find((p) => p.id === progressId);
        
        if (progressRecord) {
          foundParts += Math.min(progressRecord.foundQty, part.quantity);
        }
      }
    });
  } else {
    // Fallback: calculate from progress records if inventory not available
    progress.forEach((record) => {
      // Exclude spare parts from the total count (spares end with '-spare' in the id)
      if (!record.id.endsWith('-spare')) {
        totalParts += record.neededQty;
        foundParts += Math.min(record.foundQty, record.neededQty);
      }
    });
  }
  
  const completionPercentage =
    totalParts > 0 ? Math.round((foundParts / totalParts) * 100) : 0;
  
  return {
    totalParts,
    foundParts,
    completionPercentage,
  };
}
