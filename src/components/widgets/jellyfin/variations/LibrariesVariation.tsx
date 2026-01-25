import React from 'react';
import { Film, Tv, HardDrive } from 'lucide-react';
import styles from '../JellyfinWidget.module.css';
import { LibraryStats } from '../types';
import { formatSize } from '../utils';

interface LibrariesVariationProps {
  libraries: LibraryStats[];
  userId?: string;
  selectedLibraries?: string[];
}

export const LibrariesVariation: React.FC<LibrariesVariationProps> = ({ libraries, userId, selectedLibraries }) => {
  if (!userId) {
    return (
        <div className={styles.emptyStateContainer}>
            <div className={styles.emptyStateIcon}>
                <HardDrive size={24} style={{ marginLeft: '4px' }} />
            </div>
            <p className="font-mono text-muted">User ID Missing</p>
        </div>
    );
  }

  const visibleLibraries = selectedLibraries && selectedLibraries.length > 0
    ? libraries.filter(lib => selectedLibraries.includes(lib.Id))
    : libraries;

  if (visibleLibraries.length === 0) {
    return (
        <div className={styles.emptyStateContainer}>
            <div className={styles.emptyStateIcon}>
                <HardDrive size={24} style={{ marginLeft: '4px' }} />
            </div>
            <p className="font-mono text-muted">No Libraries Found</p>
        </div>
    );
  }

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.libraryList}>
        {visibleLibraries.map((lib) => (
          <div key={lib.Id} className={styles.libraryItem}>
            <div className={styles.libraryIcon}>
              {lib.CollectionType === 'tvshows' ? <Tv size={20} /> : 
               lib.CollectionType === 'movies' ? <Film size={20} /> : 
               <HardDrive size={20} />}
            </div>
            <div className={styles.libraryInfo}>
              <span className={styles.libraryName}>{lib.Name}</span>
              <div className={styles.libraryStats}>
                {lib.CollectionType === 'movies' && (
                  <span>{lib.Counts.Movies || 0} Movies</span>
                )}
                {lib.CollectionType === 'tvshows' && (
                  <>
                    <span>{lib.Counts.Series || 0} Series</span>
                    <span className={styles.statSeparator} />
                    <span>{lib.Counts.Episodes || 0} Eps</span>
                  </>
                )}
                <span className={styles.statSeparator} />
                <span>{formatSize(lib.TotalSize)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
