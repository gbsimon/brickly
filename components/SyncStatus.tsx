'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPendingSyncCount, replaySyncQueue } from '@/db/sync-queue';
import { useTranslations } from 'next-intl';
import styles from './SyncStatus.module.scss';

export default function SyncStatus() {
  const t = useTranslations('syncStatus');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Poll for pending sync count
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing((current) => {
      if (current) return current; // Already syncing
      return true;
    });

    try {
      const result = await replaySyncQueue();
      setLastSyncResult({ success: result.success, failed: result.failed });
      
      // Update pending count
      const newCount = await getPendingSyncCount();
      setPendingCount(newCount);

      // Clear result after 3 seconds
      setTimeout(() => {
        setLastSyncResult(null);
      }, 3000);
    } catch (error) {
      console.error('[SyncStatus] Error syncing:', error);
      const currentCount = await getPendingSyncCount();
      setLastSyncResult({ success: 0, failed: currentCount });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      handleSync();
    }
  }, [isOnline, pendingCount, isSyncing, handleSync]);

  // Don't show anything if online and no pending items
  if (isOnline && pendingCount === 0 && !lastSyncResult) {
    return null;
  }

  return (
    <div className={styles.syncStatus}>
      {!isOnline && (
        <div className={styles.offline}>
          <span className={styles.icon}>📡</span>
          <span className={styles.text}>{t('offline')}</span>
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className={styles.pending}>
          <span className={styles.icon}>
            {isSyncing ? '⏳' : '🔄'}
          </span>
          <span className={styles.text}>
            {isSyncing
              ? t('syncing', { count: pendingCount })
              : t('pending', { count: pendingCount })}
          </span>
          {!isSyncing && (
            <button
              onClick={handleSync}
              className={styles.retryButton}
              aria-label={t('retry')}
            >
              {t('retry')}
            </button>
          )}
        </div>
      )}

      {lastSyncResult && (
        <div
          className={`${styles.result} ${
            lastSyncResult.failed > 0 ? styles.failed : styles.success
          }`}
        >
          <span className={styles.icon}>
            {lastSyncResult.failed > 0 ? '⚠️' : '✅'}
          </span>
          <span className={styles.text}>
            {lastSyncResult.failed > 0
              ? t('syncFailed', { failed: lastSyncResult.failed })
              : t('syncSuccess', { success: lastSyncResult.success })}
          </span>
        </div>
      )}
    </div>
  );
}
