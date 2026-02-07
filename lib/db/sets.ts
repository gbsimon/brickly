// Server-side database functions for sets (Postgres)

import { db, query } from '@/lib/db/client';
import type { SetDetail } from '@/rebrickable/types';

/**
 * Get all sets for a user from the database
 */
export async function getUserSets(userId: string) {
  const sets = await query<{
    setNum: string;
    name: string;
    year: number;
    numParts: number;
    imageUrl: string | null;
    themeId: number;
    themeName: string | null;
    isOngoing: boolean;
    isHidden: boolean;
    addedAt: Date;
    lastOpenedAt: Date;
  }>`select "setNum", name, year, "numParts", "imageUrl", "themeId", "themeName",
          "isOngoing", "isHidden", "addedAt", "lastOpenedAt"
     from "sets"
    where "userId" = ${userId}
    order by "lastOpenedAt" desc`;

  return sets.map((set) => ({
    setNum: set.setNum,
    name: set.name,
    year: set.year,
    numParts: set.numParts,
    imageUrl: set.imageUrl,
    themeId: set.themeId,
    themeName: set.themeName || undefined,
    isOngoing: set.isOngoing,
    isHidden: set.isHidden,
    addedAt: set.addedAt.getTime(), // Convert to timestamp
    lastOpenedAt: set.lastOpenedAt.getTime(),
  }));
}

export async function getUserSet(userId: string, setNum: string) {
  const result = await query<{ setNum: string }>`select "setNum"
    from "sets"
    where "userId" = ${userId} and "setNum" = ${setNum}
    limit 1`;
  return result[0] ?? null;
}

/**
 * Add a set to the database for a user
 */
export async function addSetToDB(userId: string, set: SetDetail) {
  const now = new Date();

  await db`insert into "sets"
      ("userId","setNum",name,year,"numParts","imageUrl","themeId","themeName","isOngoing","addedAt","lastOpenedAt")
      values (${userId}, ${set.setNum}, ${set.name}, ${set.year}, ${set.numParts},
              ${set.imageUrl || null}, ${set.themeId}, ${set.themeName || null},
              ${false}, ${now}, ${now})
      on conflict ("userId","setNum") do update
      set "themeName" = excluded."themeName",
          "lastOpenedAt" = excluded."lastOpenedAt"`;
}

/**
 * Remove a set from the database for a user
 * This will cascade delete inventory and progress records
 */
export async function removeSetFromDB(userId: string, setNum: string) {
  await db`delete from "sets" where "userId" = ${userId} and "setNum" = ${setNum}`;
}

/**
 * Update the lastOpenedAt timestamp for a set
 */
export async function updateSetLastOpened(userId: string, setNum: string) {
  await db`update "sets"
    set "lastOpenedAt" = ${new Date()}
    where "userId" = ${userId} and "setNum" = ${setNum}`;
}

/**
 * Toggle the ongoing status of a set
 */
export async function toggleSetOngoing(userId: string, setNum: string, isOngoing: boolean) {
  await db`update "sets"
    set "isOngoing" = ${isOngoing}
    where "userId" = ${userId} and "setNum" = ${setNum}`;
}

/**
 * Toggle the hidden status of a set
 */
export async function toggleSetHidden(userId: string, setNum: string, isHidden: boolean) {
  await db`update "sets"
    set "isHidden" = ${isHidden}
    where "userId" = ${userId} and "setNum" = ${setNum}`;
}

/**
 * Update theme name for a set
 */
export async function updateSetThemeNames(userId: string, setNum: string, themeName: string) {
  await db`update "sets"
    set "themeName" = ${themeName}
    where "userId" = ${userId} and "setNum" = ${setNum}`;
}
