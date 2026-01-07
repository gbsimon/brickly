// Sync queue management for offline operation queuing and replay

import { db } from './database';
import type { SyncQueueItem, SyncOperationType } from './types';
import type { SetDetail } from '@/rebrickable/types';
import { logClientError, createContextLogger } from '@/lib/client-logger';

const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_MS = 1000; // 1 second base delay

/**
 * Queue a sync operation when API call fails
 */
export async function queueSyncOperation(
  operation: SyncOperationType,
  payload: any
): Promise<void> {
  await db.syncQueue.add({
    operation,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  });
  console.log(`[SYNC_QUEUE] Queued ${operation} operation`, payload);
}

/**
 * Check if we're online
 */
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Replay all pending sync operations
 * Returns the number of successfully synced operations
 */
export async function replaySyncQueue(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  if (!isOnline()) {
    console.log('[SYNC_QUEUE] Offline, skipping replay');
    return { success: 0, failed: 0, total: 0 };
  }

  const pending = await db.syncQueue
    .orderBy('createdAt')
    .toArray();

  if (pending.length === 0) {
    return { success: 0, failed: 0, total: 0 };
  }

  console.log(`[SYNC_QUEUE] Replaying ${pending.length} pending operations`);

  let success = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const synced = await executeSyncOperation(item);
      if (synced) {
        // Remove from queue on success
        if (item.id !== undefined) {
          await db.syncQueue.delete(item.id);
        }
        success++;
      } else {
        // Increment retry count and update lastRetryAt
        if (item.id !== undefined) {
          const newRetryCount = item.retryCount + 1;
          if (newRetryCount >= MAX_RETRY_COUNT) {
            // Max retries reached, remove from queue
            console.warn(`[SYNC_QUEUE] Max retries reached for operation ${item.operation}, removing from queue`);
            await db.syncQueue.delete(item.id);
            failed++;
          } else {
            await db.syncQueue.update(item.id, {
              retryCount: newRetryCount,
              lastRetryAt: Date.now(),
            });
            failed++;
          }
        }
      }
    } catch (error) {
      const logger = createContextLogger({ 
        lastAction: `replaySyncQueue-${item.operation}`,
        setNum: item.payload?.setNum 
      });
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        operation: item.operation,
        retryCount: item.retryCount,
      });
      // Increment retry count
      if (item.id !== undefined) {
        const newRetryCount = item.retryCount + 1;
        if (newRetryCount >= MAX_RETRY_COUNT) {
          await db.syncQueue.delete(item.id);
        } else {
          await db.syncQueue.update(item.id, {
            retryCount: newRetryCount,
            lastRetryAt: Date.now(),
          });
        }
      }
      failed++;
    }
  }

  console.log(`[SYNC_QUEUE] Replay complete: ${success} succeeded, ${failed} failed`);
  return { success, failed, total: pending.length };
}

/**
 * Execute a single sync operation
 * Returns true if successful, false otherwise
 */
async function executeSyncOperation(item: SyncQueueItem): Promise<boolean> {
  try {
    switch (item.operation) {
      case 'addSet': {
        const response = await fetch('/api/sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });
        return response.ok;
      }

      case 'removeSet': {
        const response = await fetch(`/api/sets/${item.payload.setNum}`, {
          method: 'DELETE',
        });
        return response.ok;
      }

      case 'toggleOngoing': {
        const response = await fetch(`/api/sets/${item.payload.setNum}/ongoing`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOngoing: item.payload.isOngoing }),
        });
        return response.ok;
      }

      case 'updateProgress': {
        const response = await fetch(`/api/sets/${item.payload.setNum}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partNum: item.payload.partNum,
            colorId: item.payload.colorId,
            isSpare: item.payload.isSpare,
            neededQty: item.payload.neededQty,
            foundQty: item.payload.foundQty,
          }),
        });
        return response.ok;
      }

      case 'bulkUpdateProgress': {
        const response = await fetch(`/api/sets/${item.payload.setNum}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload.progressArray),
        });
        return response.ok;
      }

      default:
        console.warn(`[SYNC_QUEUE] Unknown operation type: ${item.operation}`);
        return false;
    }
  } catch (error) {
    const logger = createContextLogger({ 
      lastAction: `executeSyncOperation-${item.operation}`,
      setNum: item.payload?.setNum 
    });
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      operation: item.operation,
    });
    return false;
  }
}

/**
 * Get pending sync queue count
 */
export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.count();
}

/**
 * Clear all sync queue items (useful for debugging)
 */
export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

