// Database query helpers

import { db } from './database';
import type { SetRecord, InventoryRecord, ProgressRecord } from './types';
import type { SetDetail, SetPart } from '@/rebrickable/types';

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
    addedAt: now,
    lastOpenedAt: now,
  });

  // Sync to database (server-side)
  try {
    await fetch('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(set),
    });
  } catch (error) {
    console.error('Failed to sync set to database:', error);
    // Continue even if sync fails - local cache is updated
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
      throw new Error('Failed to sync sets from database');
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
        addedAt: set.addedAt,
        lastOpenedAt: set.lastOpenedAt,
      }));

      await db.sets.bulkPut(setRecords);
    }
  } catch (error) {
    console.error('Failed to sync sets from database:', error);
    // Continue with local cache if sync fails
  }
}

export async function updateSetLastOpened(setNum: string): Promise<void> {
  await db.sets.update(setNum, {
    lastOpenedAt: Date.now(),
  });
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
    await fetch(`/api/sets/${setNum}/delete`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to sync set removal to database:', error);
    // Continue even if sync fails - local cache is updated
  }
}

/**
 * Inventory operations
 */
export async function saveInventory(
  setNum: string,
  parts: SetPart[]
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
    })),
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

    await fetch(`/api/sets/${setNum}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressData),
    });
  } catch (error) {
    console.error('Failed to sync initial progress to database:', error);
    // Continue even if sync fails - local cache is updated
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
    await fetch(`/api/sets/${setNum}/progress`, {
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
  } catch (error) {
    console.error('Failed to sync progress to database:', error);
    // Continue even if sync fails - local cache is updated
  }
}

export async function getProgressForSet(
  setNum: string
): Promise<ProgressRecord[]> {
  return db.progress.where('setNum').equals(setNum).toArray();
}

/**
 * Sync progress from database to IndexedDB
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

    // Clear existing progress for this set and bulk add synced progress
    await db.progress.where('setNum').equals(setNum).delete();
    
    const progressRecords: ProgressRecord[] = progress.map((p: any) => ({
      id: createProgressId(setNum, p.partNum, p.colorId, p.isSpare),
      setNum,
      partNum: p.partNum,
      colorId: p.colorId,
      neededQty: p.neededQty,
      foundQty: p.foundQty,
      updatedAt: p.updatedAt,
    }));

    await db.progress.bulkPut(progressRecords);
  } catch (error) {
    console.error('Failed to sync progress from database:', error);
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

