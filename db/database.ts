// Dexie database schema and initialization

import Dexie, { Table } from 'dexie';
import type { SetRecord, InventoryRecord, ProgressRecord } from './types';

export class BrickByBrickDB extends Dexie {
  sets!: Table<SetRecord, string>;
  inventories!: Table<InventoryRecord, string>;
  progress!: Table<ProgressRecord, string>;

  constructor() {
    super('BrickByBrickDB');

    // Define schema
    this.version(1).stores({
      sets: 'setNum, name, addedAt, lastOpenedAt', // Indexes for sorting
      inventories: 'setNum, fetchedAt',
      progress: 'id, setNum, updatedAt', // Composite key, indexed by setNum for queries
    });
  }
}

// Create and export a singleton instance
export const db = new BrickByBrickDB();

