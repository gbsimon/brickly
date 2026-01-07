// React hook for database access
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/db';
import type { SetRecord, InventoryRecord, ProgressRecord } from '@/db/types';

/**
 * Hook to check if database is ready
 */
export function useDatabaseReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    db.open()
      .then(() => setReady(true))
      .catch((error) => {
        console.error('Database initialization error:', error);
        setReady(false);
      });
  }, []);

  return ready;
}

/**
 * Hook to get all sets
 */
export function useSets() {
  const [sets, setSets] = useState<SetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    db.sets
      .orderBy('lastOpenedAt')
      .reverse()
      .toArray()
      .then((data) => {
        setSets(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { sets, loading, error };
}

/**
 * Hook to get a single set
 */
export function useSet(setNum: string | null) {
  const [set, setSet] = useState<SetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!setNum) {
      setSet(null);
      setLoading(false);
      return;
    }

    db.sets
      .get(setNum)
      .then((data) => {
        setSet(data || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [setNum]);

  return { set, loading, error };
}

/**
 * Hook to get inventory for a set
 */
export function useInventory(setNum: string | null) {
  const [inventory, setInventory] = useState<InventoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!setNum) {
      setInventory(null);
      setLoading(false);
      return;
    }

    db.inventories
      .get(setNum)
      .then((data) => {
        setInventory(data || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [setNum]);

  return { inventory, loading, error };
}

/**
 * Hook to get progress for a set
 */
export function useProgress(setNum: string | null) {
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!setNum) {
      setProgress([]);
      setLoading(false);
      return;
    }

    db.progress
      .where('setNum')
      .equals(setNum)
      .toArray()
      .then((data) => {
        setProgress(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [setNum]);

  return { progress, loading, error };
}

