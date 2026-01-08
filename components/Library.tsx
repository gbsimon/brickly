'use client';

import { useState, useCallback, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useSets } from '@/lib/hooks/useDatabase';
import { syncSetsFromDB } from '@/db/queries';
import { useOnlineSync } from '@/lib/hooks/useOnlineSync';
import SetSearch from './SetSearch';
import SetCard from './SetCard';
import HelpPopup from './HelpPopup';
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

  // Handle online/offline sync queue replay
  useOnlineSync();

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

        {!loading && !error && sets.length > 0 && (() => {
          const ongoingSets = sets.filter(set => set.isOngoing);
          const allSets = sets.filter(set => !set.isOngoing);

          return (
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
            </div>
          );
        })()}
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

