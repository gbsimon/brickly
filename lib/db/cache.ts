// Server-side cache helpers for Rebrickable data (global, not user-specific)

import { db, query } from '@/lib/db/client';
import type { SetDetail, SetPart, SetMinifig } from '@/rebrickable/types';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isFresh(fetchedAt: Date, ttlMs: number) {
  return Date.now() - fetchedAt.getTime() < ttlMs;
}

export async function getCachedSet(
  setNum: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<SetDetail | null> {
  const cached = await query<{ data: any; fetchedAt: Date }>`select data, "fetchedAt"
    from "cached_sets"
    where "setNum" = ${setNum}
    limit 1`;
  if (!cached[0]) return null;
  if (!isFresh(cached[0].fetchedAt, ttlMs)) return null;
  return cached[0].data as SetDetail;
}

export async function upsertCachedSet(setNum: string, data: SetDetail) {
  const now = new Date();
  await db`insert into "cached_sets" ("setNum", data, "fetchedAt")
      values (${setNum}, ${db.json(JSON.parse(JSON.stringify(data)) as any)}, ${now})
      on conflict ("setNum") do update
      set data = excluded.data,
          "fetchedAt" = excluded."fetchedAt"`;
}

export async function getCachedInventory(
  setNum: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<{ parts: SetPart[]; minifigs: SetMinifig[] } | null> {
  const cached = await query<{ parts: any; minifigs: any; fetchedAt: Date }>`select parts, minifigs, "fetchedAt"
    from "cached_inventories"
    where "setNum" = ${setNum}
    limit 1`;
  if (!cached[0]) return null;
  if (!isFresh(cached[0].fetchedAt, ttlMs)) return null;

  return {
    parts: (cached[0].parts as SetPart[]) || [],
    minifigs: (cached[0].minifigs as SetMinifig[]) || [],
  };
}

export async function upsertCachedInventory(
  setNum: string,
  parts: SetPart[],
  minifigs: SetMinifig[]
) {
  const now = new Date();
  await db`insert into "cached_inventories" ("setNum", parts, minifigs, "fetchedAt")
      values (
        ${setNum},
        ${db.json(JSON.parse(JSON.stringify(parts)) as any)},
        ${db.json(JSON.parse(JSON.stringify(minifigs)) as any)},
        ${now}
      )
      on conflict ("setNum") do update
      set parts = excluded.parts,
          minifigs = excluded.minifigs,
          "fetchedAt" = excluded."fetchedAt"`;
}

export function getCacheTtlMs() {
  return DEFAULT_TTL_MS;
}
