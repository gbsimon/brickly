// Server-side database functions for progress (using Prisma)

import { prisma } from '@/lib/prisma';

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
}

/**
 * Bulk save progress records for a set
 */
export async function bulkSaveProgressToDB(userId: string, progressArray: ProgressData[]) {
  // Use transaction to ensure all or nothing
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
    )
  );
}

