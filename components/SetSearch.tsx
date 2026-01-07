'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetSearchResult } from '@/rebrickable/types';
import { addSet } from '@/db/queries';

interface SetSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSetAdded: () => void;
}

export default function SetSearch({ isOpen, onClose, onSetAdded }: SetSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SetSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingSetNum, setAddingSetNum] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchSets(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchSets = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/sets/search?q=${encodeURIComponent(searchQuery)}&page_size=20`
      );

      if (!response.ok) {
        throw new Error('Failed to search sets');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSet = async (set: SetSearchResult) => {
    setAddingSetNum(set.setNum);
    setError(null);

    try {
      // Convert SetSearchResult to SetDetail format
      await addSet({
        setNum: set.setNum,
        name: set.name,
        year: set.year,
        numParts: set.numParts,
        imageUrl: set.imageUrl,
        themeId: set.themeId,
      });

      // Notify parent and close
      onSetAdded();
      onClose();
      setQuery('');
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add set');
    } finally {
      setAddingSetNum(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Search Sets</h2>
              <button
                onClick={onClose}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                aria-label="Close"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by set number or name..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto px-6 py-4">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              </div>
            )}

            {!loading && query && results.length === 0 && !error && (
              <div className="py-8 text-center text-gray-500">
                No sets found. Try a different search term.
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-3">
                {results.map((set) => (
                  <div
                    key={set.setNum}
                    className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                  >
                    {/* Set Image */}
                    <div className="flex-shrink-0">
                      {set.imageUrl ? (
                        <img
                          src={set.imageUrl}
                          alt={set.name}
                          className="h-16 w-16 rounded object-cover"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
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

                    {/* Set Info */}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{set.name}</h3>
                      <p className="text-sm text-gray-500">
                        Set #{set.setNum} • {set.numParts} parts • {set.year}
                      </p>
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={() => handleAddSet(set)}
                      disabled={addingSetNum === set.setNum}
                      className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {addingSetNum === set.setNum ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Adding...
                        </span>
                      ) : (
                        'Add'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!loading && !query && (
              <div className="py-8 text-center text-gray-500">
                Start typing to search for LEGO sets...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

