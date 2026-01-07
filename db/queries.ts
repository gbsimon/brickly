// Database query helpers

import { db } from './database';
import type { SetRecord, InventoryRecord, ProgressRecord } from './types';
import type { SetDetail, SetPart } from '@/rebrickable/types';

/**
 * Sets operations
 */
export async function addSet(set: SetDetail): Promise<void> {
  const now = Date.now();
  
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
}

export async function getSet(setNum: string): Promise<SetRecord | undefined> {
  return db.sets.get(setNum);
}

export async function getAllSets(): Promise<SetRecord[]> {
  return db.sets.orderBy('lastOpenedAt').reverse().toArray();
}

export async function updateSetLastOpened(setNum: string): Promise<void> {
  await db.sets.update(setNum, {
    lastOpenedAt: Date.now(),
  });
}

export async function removeSet(setNum: string): Promise<void> {
  // Remove set, its inventory, and all related progress
  await Promise.all([
    db.sets.delete(setNum),
    db.inventories.delete(setNum),
    db.progress.where('setNum').equals(setNum).delete(),
  ]);
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
  colorId: number
): string {
  return `${setNum}-${partNum}-${colorId}`;
}

export async function initializeProgress(
  setNum: string,
  parts: SetPart[]
): Promise<void> {
  const now = Date.now();
  const progressRecords: ProgressRecord[] = parts.map((part) => ({
    id: createProgressId(setNum, part.partNum, part.colorId),
    setNum,
    partNum: part.partNum,
    colorId: part.colorId,
    neededQty: part.quantity,
    foundQty: 0,
    updatedAt: now,
  }));

  await db.progress.bulkPut(progressRecords);
}

export async function updateProgress(
  setNum: string,
  partNum: string,
  colorId: number,
  foundQty: number
): Promise<void> {
  const id = createProgressId(setNum, partNum, colorId);
  
  // Get existing record or create new one
  const existing = await db.progress.get(id);
  
  if (existing) {
    await db.progress.update(id, {
      foundQty: Math.max(0, foundQty), // Ensure non-negative
      updatedAt: Date.now(),
    });
  } else {
    // If progress doesn't exist, we need the neededQty from inventory
    const inventory = await getInventory(setNum);
    const part = inventory?.parts.find(
      (p) => p.partNum === partNum && p.colorId === colorId
    );
    
    if (part) {
      await db.progress.put({
        id,
        setNum,
        partNum,
        colorId,
        neededQty: part.quantity,
        foundQty: Math.max(0, foundQty),
        updatedAt: Date.now(),
      });
    }
  }
}

export async function getProgressForSet(
  setNum: string
): Promise<ProgressRecord[]> {
  return db.progress.where('setNum').equals(setNum).toArray();
}

export async function getProgress(
  setNum: string,
  partNum: string,
  colorId: number
): Promise<ProgressRecord | undefined> {
  const id = createProgressId(setNum, partNum, colorId);
  return db.progress.get(id);
}

/**
 * Utility: Get progress summary for a set
 */
export async function getProgressSummary(setNum: string): Promise<{
  totalParts: number;
  foundParts: number;
  completionPercentage: number;
}> {
  const progress = await getProgressForSet(setNum);
  
  let totalParts = 0;
  let foundParts = 0;
  
  progress.forEach((record) => {
    totalParts += record.neededQty;
    foundParts += Math.min(record.foundQty, record.neededQty);
  });
  
  const completionPercentage =
    totalParts > 0 ? Math.round((foundParts / totalParts) * 100) : 0;
  
  return {
    totalParts,
    foundParts,
    completionPercentage,
  };
}

