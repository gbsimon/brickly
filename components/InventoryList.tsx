'use client';

import { useState, useMemo } from 'react';
import { updateProgress } from '@/db/queries';
import type { SetPart } from '@/rebrickable/types';
import type { ProgressRecord } from '@/db/types';

interface InventoryListProps {
  setNum: string;
  parts: SetPart[];
  progress: ProgressRecord[];
  onProgressUpdate?: () => void;
}

export default function InventoryList({ setNum, parts, progress, onProgressUpdate }: InventoryListProps) {
  const [hideCompleted, setHideCompleted] = useState(false);

  // Create a map of progress for quick lookup
  const progressMap = useMemo(() => {
    const map = new Map<string, ProgressRecord>();
    progress.forEach((p) => {
      const key = `${p.partNum}-${p.colorId}`;
      map.set(key, p);
    });
    return map;
  }, [progress]);

  const handleIncrement = async (part: SetPart) => {
    const key = `${part.partNum}-${part.colorId}`;
    const currentProgress = progressMap.get(key);
    const currentFound = currentProgress?.foundQty || 0;
    const newFound = currentFound + 1;

    await updateProgress(setNum, part.partNum, part.colorId, newFound);
    onProgressUpdate?.();
  };

  const handleDecrement = async (part: SetPart) => {
    const key = `${part.partNum}-${part.colorId}`;
    const currentProgress = progressMap.get(key);
    const currentFound = currentProgress?.foundQty || 0;
    const newFound = Math.max(0, currentFound - 1);

    await updateProgress(setNum, part.partNum, part.colorId, newFound);
    onProgressUpdate?.();
  };

  // Filter parts based on hideCompleted
  const filteredParts = useMemo(() => {
    if (!hideCompleted) return parts;

    return parts.filter((part) => {
      const key = `${part.partNum}-${part.colorId}`;
      const prog = progressMap.get(key);
      const found = prog?.foundQty || 0;
      return found < part.quantity;
    });
  }, [parts, progressMap, hideCompleted]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Inventory ({filteredParts.length} {filteredParts.length === 1 ? 'part' : 'parts'})
        </h2>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Hide completed</span>
        </label>
      </div>

      {/* Parts List */}
      <div className="space-y-2">
        {filteredParts.map((part) => {
          const key = `${part.partNum}-${part.colorId}`;
          const prog = progressMap.get(key);
          const found = prog?.foundQty || 0;
          const needed = part.quantity;
          const isComplete = found >= needed;

          return (
            <div
              key={key}
              className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                isComplete && !hideCompleted
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              {/* Part Image */}
              <div className="flex-shrink-0">
                {part.imageUrl ? (
                  <img
                    src={part.imageUrl}
                    alt={part.partName}
                    className="h-16 w-16 rounded object-cover bg-gray-100"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23e5e7eb"/%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-200 text-gray-400">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Part Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {part.partName || part.partNum}
                </h3>
                <p className="text-sm text-gray-500">
                  {part.colorName} • Part #{part.partNum}
                </p>
                {part.isSpare && (
                  <span className="mt-1 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                    Spare
                  </span>
                )}
              </div>

              {/* Counter */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {found} / {needed}
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-gray-300">
                  <button
                    onClick={() => handleDecrement(part)}
                    disabled={found === 0}
                    className="rounded-l-lg px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                      />
                    </svg>
                  </button>
                  <span className="px-3 py-2 text-sm font-medium text-gray-900 min-w-[3ch] text-center">
                    {found}
                  </span>
                  <button
                    onClick={() => handleIncrement(part)}
                    disabled={found >= needed}
                    className="rounded-r-lg px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hideCompleted && filteredParts.length === 0 && (
        <div className="rounded-lg bg-green-50 p-8 text-center">
          <p className="text-green-800 font-medium">All parts completed! 🎉</p>
        </div>
      )}
    </div>
  );
}

