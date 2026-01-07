'use client';

import { useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useSets } from '@/lib/hooks/useDatabase';
import SetSearch from './SetSearch';
import SetCard from './SetCard';

export default function Library() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { sets, loading, error } = useSets(refreshKey);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSetAdded = useCallback(() => {
    // Trigger a refresh by updating the key
    // This will cause the component to re-render and fetch fresh data
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="min-h-screen safe" style={{ background: 'var(--bg)' }}>
      <header className="toolbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="largeTitle">My Sets</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="buttonPrimary"
              >
                Add Set
              </button>
              <button
                onClick={handleSignOut}
                className="buttonGhost"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
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
            <p className="subhead" style={{ fontSize: '18px' }}>Your library is empty</p>
            <p className="subhead mt-2">Add your first set to get started</p>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="buttonPrimary mt-4"
            >
              Search Sets
            </button>
          </div>
        )}

        {!loading && !error && sets.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((set) => (
              <SetCard
                key={set.setNum}
                set={set}
                onRemove={() => setRefreshKey((prev) => prev + 1)}
              />
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


