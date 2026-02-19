// Server-side database functions for progress (Postgres)

import { db, query } from '@/lib/db/client';
import { randomUUID } from "crypto";

export interface ProgressData {
  setNum: string;
  partNum: string;
  colorId: number;
  isSpare: boolean;
  neededQty: number;
  foundQty: number;
  updatedAt?: number;
}

/**
 * Get all progress records for a user's set
 */
export async function getUserProgress(userId: string, setNum: string) {
  const progress = await query<{
    setNum: string;
    partNum: string;
    colorId: number;
    isSpare: boolean;
    neededQty: number;
    foundQty: number;
    updatedAt: Date;
  }>`select "setNum","partNum","colorId","isSpare","neededQty","foundQty","updatedAt"
     from "progress"
    where "userId" = ${userId} and "setNum" = ${setNum}`;

  return progress.map((p) => ({
    setNum: p.setNum,
    partNum: p.partNum,
    colorId: p.colorId,
    isSpare: p.isSpare,
    neededQty: p.neededQty,
    foundQty: p.foundQty,
    updatedAt: p.updatedAt.getTime(),
  }));
}

/**
 * Save or update progress records for a set
 * Uses upsert to handle both create and update
 */
export async function saveProgressToDB(userId: string, progressData: ProgressData) {
  try {
    const id = randomUUID();
    const updatedAt = progressData.updatedAt
      ? new Date(progressData.updatedAt)
      : new Date();
    await db`insert into "progress"
        (id,"userId","setNum","partNum","colorId","isSpare","neededQty","foundQty","updatedAt")
        values (
          ${id},
          ${userId},
          ${progressData.setNum},
          ${progressData.partNum},
          ${progressData.colorId},
          ${progressData.isSpare},
          ${progressData.neededQty},
          ${Math.max(0, progressData.foundQty)},
          ${updatedAt}
        )
        on conflict ("userId","setNum","partNum","colorId","isSpare")
        do update set
          "foundQty" = ${Math.max(0, progressData.foundQty)},
          "updatedAt" = ${updatedAt}`;
  } catch (error: any) {
    // If foreign key constraint fails, it means the set doesn't exist
    // Log the error but re-throw it so the API route can handle it
    if (error?.code === "23503") {
      console.error('[saveProgressToDB] Foreign key constraint failed - set may not exist:', {
        userId,
        setNum: progressData.setNum,
        error: error.message,
      });
    }
    throw error;
  }
}

/**
 * Get aggregated progress summaries for all sets belonging to a user.
 * Only returns sets where foundParts > 0.
 */
export async function getProgressSummariesForUser(userId: string) {
  const rows = await query<{
    setNum: string;
    totalParts: string; // SQL SUM returns string
    foundParts: string;
  }>`select "setNum",
          coalesce(sum("neededQty") filter (where not "isSpare"), 0) as "totalParts",
          coalesce(sum(least("foundQty", "neededQty")) filter (where not "isSpare"), 0) as "foundParts"
     from "progress"
    where "userId" = ${userId}
    group by "setNum"
   having sum(least("foundQty", "neededQty")) filter (where not "isSpare") > 0`;

  return rows.map((r) => ({
    setNum: r.setNum,
    totalParts: Number(r.totalParts),
    foundParts: Number(r.foundParts),
  }));
}

/**
 * Bulk save progress records for a set
 * Uses batching for large arrays to avoid transaction timeouts
 */
export async function bulkSaveProgressToDB(userId: string, progressArray: ProgressData[]) {
  // Batch size: process in chunks to keep transactions quick
  const BATCH_SIZE = 50;

  // Helper function to execute upserts without a transaction to avoid Accelerate limits
  const executeBatch = async (batch: ProgressData[]) => {
    await Promise.all(batch.map((progressData) => saveProgressToDB(userId, progressData)));
  };

  // If array is small, use a single transaction
  if (progressArray.length <= BATCH_SIZE) {
    await executeBatch(progressArray);
    return;
  }

  // For large arrays, process in batches
  for (let i = 0; i < progressArray.length; i += BATCH_SIZE) {
    const batch = progressArray.slice(i, i + BATCH_SIZE);
    await executeBatch(batch);
  }
}
