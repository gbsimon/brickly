// Server-side database functions for sets (using Prisma)

import { prisma } from '@/lib/prisma';
import type { SetDetail } from '@/rebrickable/types';

/**
 * Get all sets for a user from the database
 */
export async function getUserSets(userId: string) {
  const sets = await prisma.set.findMany({
    where: { userId },
    orderBy: { lastOpenedAt: 'desc' },
  });

  return sets.map((set) => ({
    setNum: set.setNum,
    name: set.name,
    year: set.year,
    numParts: set.numParts,
    imageUrl: set.imageUrl,
    themeId: set.themeId,
    isOngoing: set.isOngoing,
    addedAt: set.addedAt.getTime(), // Convert to timestamp
    lastOpenedAt: set.lastOpenedAt.getTime(),
  }));
}

/**
 * Add a set to the database for a user
 */
export async function addSetToDB(userId: string, set: SetDetail) {
  const now = new Date();

  await prisma.set.upsert({
    where: {
      userId_setNum: {
        userId,
        setNum: set.setNum,
      },
    },
    create: {
      userId,
      setNum: set.setNum,
      name: set.name,
      year: set.year,
      numParts: set.numParts,
      imageUrl: set.imageUrl,
      themeId: set.themeId,
      isOngoing: false, // New sets default to not ongoing
      addedAt: now,
      lastOpenedAt: now,
    },
    update: {
      // Update lastOpenedAt if set already exists
      lastOpenedAt: now,
    },
  });
}

/**
 * Remove a set from the database for a user
 * This will cascade delete inventory and progress records
 */
export async function removeSetFromDB(userId: string, setNum: string) {
  await prisma.set.delete({
    where: {
      userId_setNum: {
        userId,
        setNum,
      },
    },
  });
}

/**
 * Update the lastOpenedAt timestamp for a set
 */
export async function updateSetLastOpened(userId: string, setNum: string) {
  await prisma.set.update({
    where: {
      userId_setNum: {
        userId,
        setNum,
      },
    },
    data: {
      lastOpenedAt: new Date(),
    },
  });
}

/**
 * Toggle the ongoing status of a set
 */
export async function toggleSetOngoing(userId: string, setNum: string, isOngoing: boolean) {
  await prisma.set.update({
    where: {
      userId_setNum: {
        userId,
        setNum,
      },
    },
    data: {
      isOngoing,
    },
  });
}

