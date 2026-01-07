// Hook to handle online/offline sync queue replay

import { useEffect } from 'react';
import { replaySyncQueue } from '@/db/sync-queue';

/**
 * Hook to automatically replay sync queue when coming back online
 */
export function useOnlineSync() {
  useEffect(() => {
    // Replay immediately if already online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      replaySyncQueue().catch((error) => {
        console.error('[useOnlineSync] Error replaying sync queue:', error);
      });
    }

    // Listen for online event
    const handleOnline = () => {
      console.log('[useOnlineSync] Back online, replaying sync queue');
      replaySyncQueue().catch((error) => {
        console.error('[useOnlineSync] Error replaying sync queue:', error);
      });
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}

