'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { SetSearchResult } from '@/rebrickable/types';
import { addSet } from '@/db/queries';
import styles from "./SetSearch.module.scss";

interface SetSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSetAdded: () => void;
}

export default function SetSearch({ isOpen, onClose, onSetAdded }: SetSearchProps) {
  const t = useTranslations('setSearch');
  const tCommon = useTranslations('common');
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
        throw new Error(t('searchError'));
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
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
      setError(err instanceof Error ? err.message : t('addError'));
    } finally {
      setAddingSetNum(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={styles.modalWrap}>
        <div className={`cardSolid ${styles.modal}`}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerRow}>
              <h2 className="navTitle">Search Sets</h2>
              <button
                onClick={onClose}
                className={`buttonGhost ${styles.closeButton}`}
                aria-label={tCommon('close')}
              >
                <svg
                  className={styles.closeIcon}
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
            <div className={styles.search}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('placeholder')}
                className={styles.searchInput}
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            {loading && (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
              </div>
            )}

            {!loading && query && results.length === 0 && !error && (
              <div className={styles.empty}>
                {t('noResults')}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="listSection">
                {results.map((set) => (
                  <div
                    key={set.setNum}
                    className={`row ${styles.row}`}
                  >
                    {/* Set Image */}
                    <div>
                      {set.imageUrl ? (
                        <img
                          src={set.imageUrl}
                          alt={set.name}
                          className={styles.thumb}
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23e5e7eb"/%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className={styles.thumbPlaceholder}>
                          <svg
                            className={styles.thumbIcon}
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
                    <div className={styles.info}>
                      <h3 className="rowTitle">{set.name}</h3>
                      <p className="rowMeta">
                        Set #{set.setNum} • {set.numParts} parts • {set.year}
                      </p>
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={() => handleAddSet(set)}
                      disabled={addingSetNum === set.setNum}
                      className={`buttonPrimary ${styles.addButton}`}
                    >
                      {addingSetNum === set.setNum ? (
                        <span className={styles.addLabel}>
                          <div className={styles.addSpinner}></div>
                          {tCommon('loading')}
                        </span>
                      ) : (
                        tCommon('add')
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!loading && !query && (
              <div className={styles.empty}>
                {t('placeholder')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
