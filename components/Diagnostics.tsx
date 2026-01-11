'use client';

import { useEffect, useState } from 'react';
import { getEnabledDebugFlags, isDevelopment, isProduction } from '@/lib/debug';
import styles from './Diagnostics.module.scss';

export default function Diagnostics() {
  const [debugFlags, setDebugFlags] = useState<string[]>([]);
  const [env, setEnv] = useState<string>('');

  useEffect(() => {
    setDebugFlags(getEnabledDebugFlags());
    setEnv(process.env.NODE_ENV || 'unknown');
  }, []);

  // Only show in development or if debug UI is enabled
  if (isProduction() && debugFlags.length === 0) {
    return null;
  }

  return (
    <div className={styles.diagnostics}>
      <div className={styles.content}>
        <span className={styles.label}>Env:</span>
        <span className={styles.value}>{env}</span>
        {debugFlags.length > 0 && (
          <>
            <span className={styles.separator}>•</span>
            <span className={styles.label}>Debug:</span>
            <span className={styles.value}>{debugFlags.join(', ')}</span>
          </>
        )}
      </div>
    </div>
  );
}
