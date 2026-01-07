// Database types for IndexedDB

export interface SetRecord {
  setNum: string; // Primary key
  name: string;
  year: number;
  numParts: number;
  imageUrl: string | null;
  themeId: number;
  isOngoing: boolean; // Whether this set is marked as "ongoing"
  addedAt: number; // Timestamp when added to library
  lastOpenedAt: number; // Timestamp when last opened
}

export interface InventoryRecord {
  setNum: string; // Primary key (one inventory per set)
  parts: Array<{
    partNum: string;
    partName: string;
    colorId: number;
    colorName: string;
    quantity: number;
    imageUrl: string | null;
    isSpare: boolean;
  }>;
  fetchedAt: number; // Timestamp when inventory was fetched
}

export interface ProgressRecord {
  id: string; // Composite key: `${setNum}-${partNum}-${colorId}`
  setNum: string;
  partNum: string;
  colorId: number;
  neededQty: number;
  foundQty: number;
  updatedAt: number; // Timestamp when last updated
}

export type SyncOperationType = 
  | 'addSet'
  | 'removeSet'
  | 'toggleOngoing'
  | 'updateProgress'
  | 'bulkUpdateProgress';

export interface SyncQueueItem {
  id?: number; // Auto-increment primary key
  operation: SyncOperationType;
  payload: any; // Operation-specific payload
  createdAt: number; // Timestamp when queued
  retryCount: number; // Number of retry attempts
  lastRetryAt?: number; // Timestamp of last retry attempt
}

