'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { removeSet, getProgressSummary } from '@/db/queries';
import type { SetRecord } from '@/db/types';

interface SetCardProps {
  set: SetRecord;
  onRemove?: () => void;
}

export default function SetCard({ set, onRemove }: SetCardProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [progressSummary, setProgressSummary] = useState<{
    totalParts: number;
    foundParts: number;
    completionPercentage: number;
  } | null>(null);

  // Load progress summary
  useEffect(() => {
    getProgressSummary(set.setNum)
      .then((summary) => {
        setProgressSummary(summary);
      })
      .catch(() => {
        // If no progress exists, that's fine - just don't show summary
        setProgressSummary(null);
      });
  }, [set.setNum]);

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking the remove button area
    if ((e.target as HTMLElement).closest('.remove-button')) {
      return;
    }
    router.push(`/sets/${set.setNum}`);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeSet(set.setNum);
      onRemove?.();
    } catch (error) {
      console.error('Failed to remove set:', error);
      alert('Failed to remove set. Please try again.');
    }
  };

  const handleCancelRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <button
        onClick={handleClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {set.imageUrl && (
          <div className="aspect-square w-full overflow-hidden bg-gray-100 relative">
            <img
              src={set.imageUrl}
              alt={set.name}
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Progress overlay */}
            {progressSummary && progressSummary.totalParts > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex-shrink-0">{progressSummary.completionPercentage}%</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${progressSummary.completionPercentage}%` }}
                    />
                  </div>
                  <span className="flex-shrink-0">
                    {progressSummary.foundParts} / {progressSummary.totalParts}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 line-clamp-2">{set.name}</h3>
          <p className="mt-1 text-sm text-gray-500">
            #{set.setNum} • {set.numParts} parts
          </p>
          {set.year && <p className="mt-1 text-xs text-gray-400">{set.year}</p>}
          
          {/* Progress summary (if no image) */}
          {!set.imageUrl && progressSummary && progressSummary.totalParts > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">
                  {progressSummary.completionPercentage}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${progressSummary.completionPercentage}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {progressSummary.foundParts} / {progressSummary.totalParts} parts found
              </p>
            </div>
          )}
        </div>
      </button>

      {/* Remove button */}
      <button
        onClick={handleRemoveClick}
        className="remove-button absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-gray-600 hover:text-red-600 flex items-center justify-center"
        aria-label="Remove set"
        type="button"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white rounded-lg p-6 m-4 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Remove Set?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove "{set.name}" from your library? This will also delete all inventory and progress data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelRemove}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

