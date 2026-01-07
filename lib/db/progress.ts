// Server-side database functions for progress (using Prisma)

import { prisma } from '@/lib/prisma';
import { addSetToDB } from '@/lib/db/sets';
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
 */
export async function getUserProgress(userId: string, setNum: string) {
  const progress = await prisma.progress.findMany({
    where: {
      userId,
      setNum,
    },
  });

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
    await prisma.progress.upsert({
      where: {
        userId_setNum_partNum_colorId_isSpare: {
          userId,
          setNum: progressData.setNum,
          partNum: progressData.partNum,
          colorId: progressData.colorId,
          isSpare: progressData.isSpare,
        },
      },
      create: {
        userId,
        setNum: progressData.setNum,
        partNum: progressData.partNum,
        colorId: progressData.colorId,
        isSpare: progressData.isSpare,
        neededQty: progressData.neededQty,
        foundQty: Math.max(0, progressData.foundQty), // Ensure non-negative
      },
      update: {
        foundQty: Math.max(0, progressData.foundQty),
        updatedAt: new Date(),
      },
    });
  } catch (error: any) {
    // If foreign key constraint fails, it means the set doesn't exist
    // Log the error but re-throw it so the API route can handle it
    if (error?.code === 'P2003') {
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
 * Bulk save progress records for a set
 * Uses batching for large arrays to avoid transaction timeouts
 */
export async function bulkSaveProgressToDB(userId: string, progressArray: ProgressData[]) {
  // Batch size: process in chunks to avoid transaction timeouts
  // Each batch uses a transaction with increased timeout
  const BATCH_SIZE = 100;
  const TRANSACTION_TIMEOUT = 30000; // 30 seconds per batch

  // If array is small, use a single transaction
  if (progressArray.length <= BATCH_SIZE) {
    await prisma.$transaction(
      progressArray.map((progressData) =>
        prisma.progress.upsert({
          where: {
            userId_setNum_partNum_colorId_isSpare: {
              userId,
              setNum: progressData.setNum,
              partNum: progressData.partNum,
              colorId: progressData.colorId,
              isSpare: progressData.isSpare,
            },
          },
          create: {
            userId,
            setNum: progressData.setNum,
            partNum: progressData.partNum,
            colorId: progressData.colorId,
            isSpare: progressData.isSpare,
            neededQty: progressData.neededQty,
            foundQty: Math.max(0, progressData.foundQty),
          },
          update: {
            foundQty: Math.max(0, progressData.foundQty),
            updatedAt: new Date(),
          },
        })
      ),
      {
        timeout: TRANSACTION_TIMEOUT,
      }
    );
    return;
  }

  // For large arrays, process in batches
  for (let i = 0; i < progressArray.length; i += BATCH_SIZE) {
    const batch = progressArray.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((progressData) =>
        prisma.progress.upsert({
          where: {
            userId_setNum_partNum_colorId_isSpare: {
              userId,
              setNum: progressData.setNum,
              partNum: progressData.partNum,
              colorId: progressData.colorId,
              isSpare: progressData.isSpare,
            },
          },
          create: {
            userId,
            setNum: progressData.setNum,
            partNum: progressData.partNum,
            colorId: progressData.colorId,
            isSpare: progressData.isSpare,
            neededQty: progressData.neededQty,
            foundQty: Math.max(0, progressData.foundQty),
          },
          update: {
            foundQty: Math.max(0, progressData.foundQty),
            updatedAt: new Date(),
          },
        })
      ),
      {
        timeout: TRANSACTION_TIMEOUT,
      }
    );
  }
}

