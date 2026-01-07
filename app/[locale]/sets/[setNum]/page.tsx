'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSet, useInventory, useProgress } from '@/lib/hooks/useDatabase';
import { updateSetLastOpened, saveInventory, initializeProgress, updateProgress, getProgress, syncProgressFromDB } from '@/db/queries';
import type { SetPart } from '@/rebrickable/types';
import InventoryList from '@/components/InventoryList';

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
      if (inventory && inventory.parts.length > 0) {
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

        // Save to IndexedDB cache
        await saveInventory(setNum, parts);

        // Initialize progress if not already done
        const existingProgress = await getProgress(setNum, parts[0]?.partNum || '', parts[0]?.colorId || 0);
        if (!existingProgress && parts.length > 0) {
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
      if (onProgressUpdate) {
        onProgressUpdate();
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  }, [setNum]);

  if (setLoading) {
    return (
      <div className="min-h-screen safe flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="min-h-screen safe flex items-center justify-center p-4">
        <div className="text-center">
          <p className="subhead mb-4">Set not found</p>
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
      <div className="min-h-screen safe flex items-center justify-center p-4">
        <div className="text-center">
          <p className="subhead mb-4 text-red-600">{error}</p>
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

  return (
    <div className="min-h-screen safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b" style={{ borderColor: 'var(--separator)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push(`/${locale}`)}
            className="p-2 -ml-2"
            aria-label="Back"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="navTitle flex-1 text-center">{set.name}</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      {isLoading && !inventory ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <InventoryList
          setNum={setNum}
          parts={parts}
          progress={progress}
          onProgressUpdate={() => setProgressRefreshKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
}


