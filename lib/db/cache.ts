// Server-side cache helpers for Rebrickable data (global, not user-specific)

import { prisma } from '@/lib/prisma';
import type { SetDetail, SetPart, SetMinifig } from '@/rebrickable/types';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isFresh(fetchedAt: Date, ttlMs: number) {
  return Date.now() - fetchedAt.getTime() < ttlMs;
}

export async function getCachedSet(
  setNum: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<SetDetail | null> {
  const cached = await prisma.cachedSet.findUnique({ where: { setNum } });
  if (!cached) return null;
  if (!isFresh(cached.fetchedAt, ttlMs)) return null;
  return cached.data as SetDetail;
}

export async function upsertCachedSet(setNum: string, data: SetDetail) {
  await prisma.cachedSet.upsert({
    where: { setNum },
    create: { setNum, data, fetchedAt: new Date() },
    update: { data, fetchedAt: new Date() },
  });
}

export async function getCachedInventory(
  setNum: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<{ parts: SetPart[]; minifigs: SetMinifig[] } | null> {
  const cached = await prisma.cachedInventory.findUnique({ where: { setNum } });
  if (!cached) return null;
  if (!isFresh(cached.fetchedAt, ttlMs)) return null;

  return {
    parts: (cached.parts as SetPart[]) || [],
    minifigs: (cached.minifigs as SetMinifig[]) || [],
  };
}

export async function upsertCachedInventory(
  setNum: string,
  parts: SetPart[],
  minifigs: SetMinifig[]
) {
  await prisma.cachedInventory.upsert({
    where: { setNum },
    create: { setNum, parts, minifigs, fetchedAt: new Date() },
    update: { parts, minifigs, fetchedAt: new Date() },
  });
}

export function getCacheTtlMs() {
  return DEFAULT_TTL_MS;
}
