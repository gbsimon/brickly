'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSet, useInventory, useProgress } from '@/lib/hooks/useDatabase';
import { updateSetLastOpened, saveInventory, initializeProgress, updateProgress, getProgress } from '@/db/queries';
import type { SetPart } from '@/rebrickable/types';
import InventoryList from '@/components/InventoryList';

export default function SetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const setNum = params?.setNum as string;

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

  // Fetch parts if inventory not cached
  useEffect(() => {
    if (!setNum || inventory || loadingParts) return;

    const fetchParts = async () => {
      setLoadingParts(true);
      setError(null);

      try {
        const response = await fetch(`/api/sets/${encodeURIComponent(setNum)}/parts`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch parts');
        }

        const data = await response.json();
        const parts: SetPart[] = data.parts || [];

        // Save inventory to cache
        await saveInventory(setNum, parts);
        
        // Trigger inventory refresh to update the UI
        setInventoryRefreshKey((prev) => prev + 1);

        // Initialize progress if it doesn't exist
        if (parts.length > 0) {
          const existingProgress = await getProgress(setNum, parts[0].partNum, parts[0].colorId, parts[0].isSpare);
          if (!existingProgress) {
            await initializeProgress(setNum, parts);
            setProgressRefreshKey((prev) => prev + 1);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load parts');
      } finally {
        setLoadingParts(false);
      }
    };

    fetchParts();
  }, [setNum, inventory, loadingParts]);

  if (setLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            Set not found
          </div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // Calculate total parts count from inventory (sum of all quantities, excluding spares)
  // Rebrickable's total quantity excludes spare parts
  const totalPartsCount = parts
    .filter((part) => !part.isSpare)
    .reduce((sum, part) => sum + part.quantity, 0);
  const uniquePartTypes = parts.filter((part) => !part.isSpare).length; // Number of unique part+color combinations (excluding spares)

  return (
    <div className="min-h-screen safe" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="toolbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="buttonGhost p-2 rounded-md"
              style={{ 
                border: '1px solid transparent',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--stroke)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
              }}
              aria-label="Back"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="largeTitle">{set.name}</h1>
              <p className="subhead">
                #{set.setNum} • {totalPartsCount > 0 ? `${totalPartsCount} parts` : `${set.numParts} part types`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {!isLoading && parts.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">No parts found for this set</p>
          </div>
        )}

        {!isLoading && parts.length > 0 && (
          <InventoryList
            setNum={setNum}
            parts={parts}
            progress={progress}
            onProgressUpdate={() => setProgressRefreshKey((prev) => prev + 1)}
          />
        )}
      </main>
    </div>
  );
}

