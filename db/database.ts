// Dexie database schema and initialization

import Dexie, { Table } from 'dexie';
import type { SetRecord, InventoryRecord, ProgressRecord, SyncQueueItem } from './types';

export class BrickByBrickDB extends Dexie {
  sets!: Table<SetRecord, string>;
  inventories!: Table<InventoryRecord, string>;
  progress!: Table<ProgressRecord, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('BrickByBrickDB');

    // Define schema
    this.version(1).stores({
      sets: 'setNum, name, addedAt, lastOpenedAt', // Indexes for sorting
      inventories: 'setNum, fetchedAt',
      progress: 'id, setNum, updatedAt', // Composite key, indexed by setNum for queries
    });

    // Version 2: Add isOngoing field
    this.version(2).stores({
      sets: 'setNum, name, addedAt, lastOpenedAt, isOngoing', // Added isOngoing index
      inventories: 'setNum, fetchedAt',
      progress: 'id, setNum, updatedAt',
    }).upgrade(async (tx) => {
      // Migrate existing sets to have isOngoing: false
      await tx.table('sets').toCollection().modify((set) => {
        if (set.isOngoing === undefined) {
          set.isOngoing = false;
        }
      });
    });

    // Version 3: Add syncQueue for offline operation queue
    this.version(3).stores({
      sets: 'setNum, name, addedAt, lastOpenedAt, isOngoing',
      inventories: 'setNum, fetchedAt',
      progress: 'id, setNum, updatedAt',
      syncQueue: '++id, operation, createdAt, retryCount', // Auto-increment id, indexed by operation type and creation time
    });
  }
}

// Create and export a singleton instance
export const db = new BrickByBrickDB();

