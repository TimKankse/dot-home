import React, { useRef, useState } from 'react';
import { Play, Film, Tv, Info } from 'lucide-react';
import styles from '../JellyfinWidget.module.css';
import { JellyfinSession, JellyfinWidgetConfig } from '../types';
import { formatTime } from '../utils';

interface NowPlayingVariationProps {
  sessions: JellyfinSession[];
  config?: JellyfinWidgetConfig;
}

export const NowPlayingVariation: React.FC<NowPlayingVariationProps> = ({ sessions, config }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTechInfo, setShowTechInfo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, clientHeight } = scrollRef.current;
      const index = Math.round(scrollTop / clientHeight);
      setActiveIndex(index);
    }
  };

  if (sessions.length === 0) {
      return (
          <div className={styles.emptyStateContainer}>
              <div className={styles.emptyStateIcon}>
                  <Play size={24} style={{ marginLeft: '4px' }} />
              </div>
              <p className="font-mono text-muted">Nothing Playing</p>
          </div>
      );
  }

  return (
    <div className={styles.widgetContainer}>
         <button 
            className={`${styles.infoButton} ${showTechInfo ? styles.active : ''}`}
            onClick={() => setShowTechInfo(!showTechInfo)}
            title="Toggle Technical Info"
        >
            <Info size={16} />
        </button>

      <div className={styles.contentArea}>
          {/* Indicator Sidebar */}
          <div className={styles.indicatorSidebar}>
              <div className={`font-mono text-muted ${styles.indicatorText}`}>
                  <span className={styles.indicatorCurrent}>{activeIndex + 1}</span>
                  <span className={styles.indicatorSeparator}>/</span>
                  <span>{sessions.length}</span>
              </div>
          </div>

          {/* Carousel Container */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className={`no-scrollbar ${styles.carouselContainer}`}
          >
            {sessions.map((session) => {
                const item = session.NowPlayingItem;
                const progress = (session.PlayState?.PositionTicks && item?.RunTimeTicks) 
                    ? (session.PlayState.PositionTicks / item.RunTimeTicks) * 100 
                    : 0;

                const posterId = (item?.Type === 'Episode' && item.SeriesId) 
                    ? item.SeriesId 
                    : item?.Id;
                
                const imageUrl = posterId && config?.url 
                    ? `/api/jellyfin/image?id=${posterId}&url=${encodeURIComponent(config.url)}&apiKey=${encodeURIComponent(config.apiKey || '')}` 
                    : null;

                return (
                    <div key={session.Id} className={styles.sessionContainer}>
                        
                        {/* Poster Column */}
                        <div className={styles.posterContainer}>
                            {imageUrl ? (
                                <img 
                                    src={imageUrl} 
                                    alt={item?.Name || 'Cover'} 
                                    className={styles.posterImage}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.classList.add(styles.showPlaceholder);
                                    }}
                                />
                            ) : null}
                             {/* Fallback Icon */}
                             <div className={`${styles.posterPlaceholder} ${!imageUrl ? styles.showPlaceholder : ''}`}>
                                    {item?.Type === 'Episode' ? <Tv size={24} /> : <Film size={24} />}
                            </div>
                        </div>

                        {/* Text Column */}
                        <div className={styles.sessionContent}>
                            <div className={styles.headerRow}>
                                {
                                    !showTechInfo ? (
                                        <div className={styles.headerGroup}>
                                            <h3 className={`font-display text-xl ${styles.sessionTitle}`}>
                                                {item?.SeriesName || item?.Name}
                                            </h3>
                                            {item?.SeriesName && (
                                                <div className={styles.episodeTitle}>
                                                    {item.Name} 
                                                </div>
                                            )}
                                        </div>
                                    ) : null
                                }
                            </div>

                            {showTechInfo ? (
                                <div className={styles.techInfoContainer}>
                                    <div className={styles.techInfoRow}>
                                        <span className={styles.techLabel}>Method</span>
                                        <span className={styles.techValue}>{session.PlayState?.PlayMethod || 'Unknown'}</span>
                                    </div>
                                    <div className={styles.techInfoRow}>
                                        <span className={styles.techLabel}>Video</span>
                                        <span className={styles.techValue}>
                                            {session.TranscodingInfo?.VideoCodec 
                                                ? `${session.TranscodingInfo.VideoCodec} (${session.TranscodingInfo.IsVideoDirect ? 'Direct' : 'Transcode'})`
                                                : 'Direct Play'}
                                        </span>
                                    </div>
                                    <div className={styles.techInfoRow}>
                                        <span className={styles.techLabel}>Audio</span>
                                        <span className={styles.techValue}>
                                            {session.TranscodingInfo?.AudioCodec 
                                                ? `${session.TranscodingInfo.AudioCodec} (${session.TranscodingInfo.IsAudioDirect ? 'Direct' : 'Transcode'})`
                                                : 'Direct Play'}
                                        </span>
                                    </div>
                                    <div className={styles.techInfoRow}>
                                        <span className={styles.techLabel}>Client</span>
                                        <span className={styles.techValue}>{session.Client}</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.sessionMeta}>
                                        <span className={styles.userBadge}>{session.UserName}</span>
                                        <span className={styles.deviceBadge}>{session.DeviceName}</span>
                                    </div>

                                    <div className={styles.progressBarContainer}>
                                        <div className={styles.progressBarFill} style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className={styles.timeInfo}>
                                        <span>{formatTime(session.PlayState?.PositionTicks || 0)}</span>
                                        <span>{formatTime(item?.RunTimeTicks || 0)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
          </div>
      </div>
    </div>
  );
};
