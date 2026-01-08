'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useSets } from '@/lib/hooks/useDatabase';
import { syncSetsFromDB, getProgressSummary } from '@/db/queries';
import { useOnlineSync } from '@/lib/hooks/useOnlineSync';
import SetSearch from './SetSearch';
import SetCard from './SetCard';
import HelpPopup from './HelpPopup';
import LibraryFilterBar, { SortKey, SortDir } from './LibraryFilterBar';
import styles from "./Library.module.scss";

export default function Library() {
  const params = useParams();
  const locale = params?.locale as string || 'en';
  const t = useTranslations('library');
  const tCommon = useTranslations('common');
  const [refreshKey, setRefreshKey] = useState(0);
  const { sets, loading, error } = useSets(refreshKey);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filter bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastOpened');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterOngoing, setFilterOngoing] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [filterThemeId, setFilterThemeId] = useState<number | "all">("all");
  const [hasProgress, setHasProgress] = useState(false);

  // Handle online/offline sync queue replay
  useOnlineSync();

  // Check if any sets have progress
  useEffect(() => {
    if (sets.length === 0) {
      setHasProgress(false);
      return;
    }

    let mounted = true;
    let checkCount = 0;
    const maxChecks = Math.min(5, sets.length); // Check up to 5 sets

    const checkProgress = async () => {
      for (const set of sets.slice(0, maxChecks)) {
        if (!mounted) return;
        try {
          const summary = await getProgressSummary(set.setNum);
          if (summary && summary.totalParts > 0) {
            if (mounted) {
              setHasProgress(true);
            }
            return;
          }
        } catch {
          // Continue checking
        }
      }
      if (mounted && checkCount >= maxChecks) {
        setHasProgress(false);
      }
    };

    checkProgress();

    return () => {
      mounted = false;
    };
  }, [sets]);

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
    await signOut({ callbackUrl: `/${locale}/auth/signin` });
  };

  // Get available themes
  const availableThemes = useMemo(() => {
    const themeMap = new Map<number, string>();
    sets.forEach((set) => {
      if (set.themeName && set.themeId) {
        themeMap.set(set.themeId, set.themeName);
      }
    });
    return Array.from(themeMap.entries())
      .map(([themeId, themeName]) => ({ themeId, themeName }))
      .sort((a, b) => a.themeName.localeCompare(b.themeName));
  }, [sets]);

  // Filter and sort sets
  const filteredAndSorted = useMemo(() => {
    let filtered = [...sets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (set) =>
          set.name.toLowerCase().includes(query) ||
          set.setNum.toLowerCase().includes(query)
      );
    }

    // Theme filter
    if (filterThemeId !== "all") {
      filtered = filtered.filter((set) => set.themeId === filterThemeId);
    }

    // Ongoing filter
    if (filterOngoing) {
      filtered = filtered.filter((set) => set.isOngoing);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'lastOpened':
          comparison = a.lastOpenedAt - b.lastOpenedAt;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'parts':
          comparison = a.numParts - b.numParts;
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [sets, searchQuery, sortKey, sortDir, filterOngoing, filterThemeId]);

  // Separate into ongoing and all sets
  const ongoingSets = filteredAndSorted.filter(set => set.isOngoing);
  const allSets = filteredAndSorted.filter(set => !set.isOngoing);

  return (
    <div className={`${styles.page} safe`}>
      <header className="toolbar">
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <div className={styles.brand}>
              <img 
                src="/brick.svg" 
                alt="BrickByBrick" 
                className={styles.brandIcon}
              />
              <h1 className="largeTitle truncate">{t('title')}</h1>
            </div>
            <div className={styles.actions}>
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`buttonPrimary ${styles.primaryButton}`}
              >
                {t('addSet')}
              </button>
              <button
                onClick={handleSignOut}
                className={`buttonGhost ${styles.ghostButton}`}
                aria-label={tCommon('signOut')}
              >
                {tCommon('signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {(loading || isSyncing) && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            {isSyncing && <span className={`subhead ${styles.syncText}`}>{t('syncing')}</span>}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            {tCommon('error')}: {error.message}
          </div>
        )}

        {!loading && !error && sets.length === 0 && (
          <div className={styles.empty}>
            <p className={`subhead ${styles.emptyTitle}`}>{t('empty')}</p>
            <p className={`subhead ${styles.emptyDescription}`}>{t('emptyDescription')}</p>
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`buttonPrimary ${styles.emptyButton}`}
            >
              {tCommon('search')}
            </button>
          </div>
        )}

        {!loading && !error && sets.length > 0 && (
          <>
            <LibraryFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortKey={sortKey}
              onSortKeyChange={setSortKey}
              sortDir={sortDir}
              onSortDirChange={setSortDir}
              filterOngoing={filterOngoing}
              onFilterOngoingChange={setFilterOngoing}
              filterCompleted={filterCompleted}
              onFilterCompletedChange={setFilterCompleted}
              filterThemeId={filterThemeId}
              onFilterThemeIdChange={setFilterThemeId}
              availableThemes={availableThemes}
              hasProgress={hasProgress}
            />

            <div className={styles.sections}>
              {/* Ongoing Section */}
              {ongoingSets.length > 0 && (
                <div>
                  <h2 className={`navTitle ${styles.sectionTitle}`}>{t('ongoing')}</h2>
                  <div className={styles.grid}>
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
                  <h2 className={`navTitle ${styles.sectionTitle}`}>{t('title')}</h2>
                  <div className={styles.grid}>
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

              {/* No results message */}
              {filteredAndSorted.length === 0 && (
                <div className={styles.empty}>
                  <p className={`subhead ${styles.emptyTitle}`}>No sets match your filters</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <SetSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSetAdded={handleSetAdded}
      />

      <HelpPopup storageKey="help-dismissed-library" />
    </div>
  );
}

