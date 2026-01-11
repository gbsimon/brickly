'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { Instruction } from '@/rebrickable/types';
import PDFViewer from './PDFViewer';
import styles from './InstructionsDropdown.module.scss';

interface InstructionsDropdownProps {
  setNum: string;
}

export default function InstructionsDropdown({ setNum }: InstructionsDropdownProps) {
  const t = useTranslations('instructions');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<Instruction | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // Load instructions on mount
  useEffect(() => {
    if (!hasChecked && setNum) {
      loadInstructions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNum]);

  const loadInstructions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sets/${setNum}/instructions`);
      if (!response.ok) {
        throw new Error('Failed to load instructions');
      }
      const data = await response.json();
      setInstructions(data.instructions || []);
      setHasChecked(true);
    } catch (error) {
      console.error('Failed to load instructions:', error);
      setInstructions([]);
      setHasChecked(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (instruction: Instruction) => {
    setSelectedPdf(instruction);
    setIsOpen(false);
  };

  const handleClosePdf = () => {
    setSelectedPdf(null);
  };

  // Only hide if we've checked and there are no instructions
  if (hasChecked && instructions.length === 0 && !loading && !isOpen) {
    return null;
  }

  return (
    <>
      <div className={styles.dropdown}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={styles.trigger}
          aria-label={t('openInstructions')}
          aria-expanded={isOpen}
          type="button"
          disabled={loading}
        >
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className={styles.label}>{t('instructions')}</span>
          {loading && <div className={styles.spinner}></div>}
        </button>

        {isOpen && (
          <>
            <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
            <div className={styles.menu}>
              {loading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <span>{t('loading')}</span>
                </div>
              ) : instructions.length === 0 ? (
                <div className={styles.empty}>
                  <span>{t('noInstructions')}</span>
                </div>
              ) : (
                instructions.map((instruction) => (
                  <button
                    key={instruction.id}
                    onClick={() => handleSelect(instruction)}
                    className={styles.menuItem}
                    type="button"
                  >
                    <svg className={styles.fileIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className={styles.menuItemText}>{instruction.description || instruction.fileName}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {selectedPdf && (
        <PDFViewer
          pdfUrl={selectedPdf.downloadUrl}
          fileName={selectedPdf.fileName}
          isOpen={!!selectedPdf}
          onClose={handleClosePdf}
        />
      )}
    </>
  );
}
