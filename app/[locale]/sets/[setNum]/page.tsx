'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSet, useInventory, useProgress } from '@/lib/hooks/useDatabase';
import { updateSetLastOpened, saveInventory, initializeProgress, updateProgress, getProgressForSet, syncProgressFromDB } from '@/db/queries';
import type { SetPart, SetMinifig } from '@/rebrickable/types';
import InventoryList from '@/components/InventoryList';
import styles from "./page.module.scss";

export default function SetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const setNum = params?.setNum as string;
  const locale = params?.locale as string || 'en';

  const { set, loading: setLoading } = useSet(setNum);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const { inventory, loading: inventoryLoading } = useInventory(setNum, inventoryRefreshKey);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const { progress, loading: progressLoading } = useProgress(setNum, progressRefreshKey);
  const [loadingParts, setLoadingParts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parts = inventory?.parts || [];
  const isLoading = inventoryLoading || loadingParts || progressLoading;

  // Update last opened timestamp when set is loaded
  useEffect(() => {
    if (set) {
      updateSetLastOpened(set.setNum);
    }
  }, [set]);

  // Load parts from API if not in cache
  useEffect(() => {
    if (!setNum) return;

    const loadParts = async () => {
      // Check if we already have inventory cached
      const hasInventory = !!inventory && inventory.parts.length > 0;
      const hasMinifigs = !!inventory && Array.isArray(inventory.minifigs);
      if (hasInventory && hasMinifigs) {
        return;
      }

      setLoadingParts(true);
      setError(null);

      try {
        const response = await fetch(`/api/sets/${setNum}/parts`);
        if (!response.ok) {
          throw new Error('Failed to load parts');
        }

        const data = await response.json();
        const parts: SetPart[] = data.parts || [];
        const minifigs: SetMinifig[] = data.minifigs || [];

        // Save to IndexedDB cache
        await saveInventory(setNum, parts, minifigs);

        // Initialize progress if not already done
        const existingProgress = await getProgressForSet(setNum);
        if (existingProgress.length === 0 && parts.length > 0) {
          await initializeProgress(setNum, parts);
          setProgressRefreshKey((prev) => prev + 1);
        }

        // Refresh inventory display
        setInventoryRefreshKey((prev) => prev + 1);
      } catch (err) {
        console.error('Failed to load parts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load parts');
      } finally {
        setLoadingParts(false);
      }
    };

    loadParts();
  }, [setNum, inventory]);

  // Sync progress from database when set is opened
  useEffect(() => {
    if (!setNum || !set) return;

    const syncProgress = async () => {
      try {
        await syncProgressFromDB(setNum);
        setProgressRefreshKey((prev) => prev + 1);
      } catch (err) {
        console.error('Failed to sync progress:', err);
        // Continue with local cache if sync fails
      }
    };

    syncProgress();
  }, [setNum, set]);

  const handleProgressUpdate = useCallback(async (
    partNum: string,
    colorId: number,
    foundQty: number,
    isSpare: boolean = false
  ) => {
    try {
      await updateProgress(setNum, partNum, colorId, foundQty, isSpare);
      setProgressRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  }, [setNum]);

  if (setLoading) {
    return (
      <div className={`safe ${styles.centered}`}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className={`safe ${styles.centered}`}>
        <div className={styles.message}>
          <p className={`subhead ${styles.messageText}`}>Set not found</p>
          <button
            onClick={() => router.push(`/${locale}`)}
            className="buttonPrimary"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  if (error && !inventory) {
    return (
      <div className={`safe ${styles.centered}`}>
        <div className={styles.message}>
          <p className={`subhead ${styles.messageText} ${styles.errorText}`}>{error}</p>
          <button
            onClick={() => {
              setError(null);
              setInventoryRefreshKey((prev) => prev + 1);
            }}
            className="buttonPrimary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate total parts count from inventory (sum of all quantities, excluding spares)
  // Rebrickable's total quantity excludes spare parts
  const totalPartsCount = parts.filter((part) => !part.isSpare).reduce((sum, part) => sum + part.quantity, 0);
  const uniquePartTypes = parts.filter((part) => !part.isSpare).length; // Number of unique part+color combinations (excluding spares)

  return (
    <div className={`safe ${styles.page}`}>
      {/* Header */}
      <header className="toolbar">
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <button
              onClick={() => router.push(`/${locale}`)}
              className={`buttonGhost ${styles.backButton}`}
              aria-label="Back"
            >
              <svg className={styles.backIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <img 
              src="/brick.svg" 
              alt="Brickly" 
              className={styles.brandIcon}
            />
            <div className={styles.titleWrap}>
              <h1 className="largeTitle truncate">{set.name}</h1>
              <p className={`subhead ${styles.meta}`}>
                #{set.setNum} • {totalPartsCount > 0 ? `${totalPartsCount} parts` : `${set.numParts} part types`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className={styles.main}>
        {isLoading && !inventory ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
          </div>
        ) : (
          <InventoryList
            setNum={setNum}
            parts={parts}
            minifigs={inventory?.minifigs || []}
            progress={progress}
            onProgressUpdate={() => setProgressRefreshKey((prev) => prev + 1)}
          />
        )}
      </main>
    </div>
  );
}
