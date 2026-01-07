'use client';

import { useState, useCallback, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useSets } from '@/lib/hooks/useDatabase';
import { syncSetsFromDB } from '@/db/queries';
import SetSearch from './SetSearch';
import SetCard from './SetCard';

export default function Library() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { sets, loading, error } = useSets(refreshKey);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync sets from database on mount (on login)
  useEffect(() => {
    let mounted = true;

    const syncSets = async () => {
      setIsSyncing(true);
      try {
        await syncSetsFromDB();
        if (mounted) {
          // Trigger refresh after sync
          setRefreshKey((prev) => prev + 1);
        }
      } catch (error) {
        console.error('Failed to sync sets from database:', error);
        // Continue with local cache if sync fails
      } finally {
        if (mounted) {
          setIsSyncing(false);
        }
      }
    };

    syncSets();

    return () => {
      mounted = false;
    };
  }, []); // Run once on mount

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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
              <img 
                src="/brick.svg" 
                alt="BrickByBrick" 
                className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0"
              />
              <h1 className="largeTitle truncate">My Sets</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="buttonPrimary text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3"
              >
                Add Set
              </button>
              <button
                onClick={handleSignOut}
                className="buttonGhost text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-3"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {(loading || isSyncing) && (
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

        {!loading && !error && sets.length > 0 && (() => {
          const ongoingSets = sets.filter(set => set.isOngoing);
          const allSets = sets.filter(set => !set.isOngoing);

          return (
            <div className="space-y-8">
              {/* Ongoing Section */}
              {ongoingSets.length > 0 && (
                <div>
                  <h2 className="navTitle mb-4">Ongoing</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ongoingSets.map((set) => (
                      <SetCard
                        key={set.setNum}
                        set={set}
                        onRemove={() => setRefreshKey((prev) => prev + 1)}
                        onOngoingToggle={() => setRefreshKey((prev) => prev + 1)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Sets Section */}
              {allSets.length > 0 && (
                <div>
                  <h2 className="navTitle mb-4">All Sets</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {allSets.map((set) => (
                      <SetCard
                        key={set.setNum}
                        set={set}
                        onRemove={() => setRefreshKey((prev) => prev + 1)}
                        onOngoingToggle={() => setRefreshKey((prev) => prev + 1)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>

      <SetSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSetAdded={handleSetAdded}
      />
    </div>
  );
}


