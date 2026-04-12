import React from 'react';
import type { BreakpointKey } from '@/constants/grid';
import { usePageStore } from '@/store/usePageStore';
import { usePersistenceStore } from '@/store/usePersistenceStore';
import { useResponsiveState } from '@/hooks/useResponsiveState';
import { X, House, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import styles from './PageIndicators.module.css';

interface PageIndicatorsProps {
  breakpoint?: BreakpointKey;
}

export const PageIndicators: React.FC<PageIndicatorsProps> = ({ breakpoint }) => {
  const { 
    pages, 
    currentPageIndex, 
    setPageIndex, 
    removePage,
    defaultPageId,
    setDefaultPage,
    movePage
  } = usePageStore();

  const { isEditing, canEditDashboard } = usePersistenceStore();
  const { breakpoint: viewportBreakpoint } = useResponsiveState();

  if (pages.length <= 1 && !isEditing) return null;

  const activeBreakpoint = breakpoint || viewportBreakpoint;
  const isVertical = activeBreakpoint === 'desktop';
  const currentPage = pages[currentPageIndex];
  const isDefault = currentPage?.id === defaultPageId;

  return (
    <div 
      className={`${styles.wrapper} ${isVertical ? styles.vertical : styles.horizontal}`}
    >
      {isEditing && canEditDashboard && (
        <div className={styles.topControl}>
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
        </div>
      )}

      <div className={styles.centerControls}>
        {isEditing && canEditDashboard && (
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
        )}

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

        {isEditing && canEditDashboard && (
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
        )}
      </div>

      {isEditing && canEditDashboard && pages.length > 1 && (
        <div className={styles.bottomControl}>
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
        </div>
      )}
    </div>
  );
};
