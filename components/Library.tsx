'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSets } from '@/lib/hooks/useDatabase';
import SetSearch from './SetSearch';
import type { SetRecord } from '@/db/types';

export default function Library() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { sets, loading, error } = useSets(refreshKey);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSetAdded = useCallback(() => {
    // Trigger a refresh by updating the key
    // This will cause the component to re-render and fetch fresh data
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">My Sets</h1>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Set
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            Error loading sets: {error.message}
          </div>
        )}

        {!loading && !error && sets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Your library is empty</p>
            <p className="text-gray-400 text-sm mt-2">Add your first set to get started</p>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="mt-4 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
            >
              Search Sets
            </button>
          </div>
        )}

        {!loading && !error && sets.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((set) => (
              <SetCard key={set.setNum} set={set} />
            ))}
          </div>
        )}
      </main>

      <SetSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSetAdded={handleSetAdded}
      />
    </div>
  );
}

function SetCard({ set }: { set: SetRecord }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/sets/${set.setNum}`)}
      className="w-full text-left overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {set.imageUrl && (
        <div className="aspect-square w-full overflow-hidden bg-gray-100">
          <img
            src={set.imageUrl}
            alt={set.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2">{set.name}</h3>
        <p className="mt-1 text-sm text-gray-500">
          #{set.setNum} • {set.numParts} parts
        </p>
        {set.year && (
          <p className="mt-1 text-xs text-gray-400">{set.year}</p>
        )}
      </div>
    </button>
  );
}

