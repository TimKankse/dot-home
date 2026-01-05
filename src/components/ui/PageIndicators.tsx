import React from 'react';
import { usePageStore } from '@/store/usePageStore';
import { usePersistenceStore } from '@/store/usePersistenceStore';
import { X, House, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import styles from './PageIndicators.module.css';

export const PageIndicators: React.FC = () => {
  const { 
    pages, 
    currentPageIndex, 
    setPageIndex, 
    scrollDirection, 
    removePage,
    defaultPageId,
    setDefaultPage,
    movePage
  } = usePageStore();

  const { isEditing } = usePersistenceStore();

  if (pages.length <= 1 && !isEditing) return null;

  const isVertical = scrollDirection === 'vertical';
  const currentPage = pages[currentPageIndex];
  const isDefault = currentPage?.id === defaultPageId;

  return (
    <div 
      className={`${styles.wrapper} ${isVertical ? styles.vertical : styles.horizontal}`}
    >
      <div className={styles.indicators}>
        {pages.map((page, index) => (
          <button
            key={page.id}
            className={`${styles.indicator} ${currentPageIndex === index ? styles.active : ''}`}
            onClick={() => setPageIndex(index)}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>
      
      {isEditing && (
        <div className={styles.controls}>
          {/* Move Previous (Left/Up) */}
          <button
            className={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              movePage('prev');
            }}
            disabled={currentPageIndex === 0}
            aria-label={isVertical ? "Move page up" : "Move page left"}
            title={isVertical ? "Move page up" : "Move page left"}
          >
            {isVertical ? <ArrowUp size={14} /> : <ArrowLeft size={14} />}
          </button>

          {/* Move Next (Right/Down) */}
          <button
            className={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              movePage('next');
            }}
            disabled={currentPageIndex === pages.length - 1}
            aria-label={isVertical ? "Move page down" : "Move page right"}
            title={isVertical ? "Move page down" : "Move page right"}
          >
            {isVertical ? <ArrowDown size={14} /> : <ArrowRight size={14} />}
          </button>

          {/* Set Default */}
          <button
            className={`${styles.actionButton} ${styles.defaultButton} ${isDefault ? styles.isDefault : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (currentPage) {
                setDefaultPage(isDefault ? '' : currentPage.id);
              }
            }}
            aria-label="Set as default page"
            title={isDefault ? "Unset default page" : "Set as default page"}
          >
            <House size={14} fill={isDefault ? "currentColor" : "none"} />
          </button>

          {/* Remove Page */}
          {pages.length > 1 && (
            <button
              className={`${styles.actionButton} ${styles.removeButton}`}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this page and all its widgets?')) {
                  removePage();
                }
              }}
              aria-label="Remove current page"
              title="Remove current page"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
