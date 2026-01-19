"use client";

import React, { useState, useEffect } from 'react';
import { Twitch, Users, AlertCircle } from 'lucide-react';
import styles from './TwitchWidget.module.css';
import type { TwitchWidgetConfig } from '@/types';
import { List } from '@/components/primitives/list/List';
import { fetchTwitchStreams, parseChannelList, formatViewerCount, TwitchChannelData } from '@/services/twitch';

const DEFAULT_CHANNELS = ['riotgames', 'shroud', 'tarik'];

export interface TwitchWidgetProps {
  isEditing?: boolean;
  config?: TwitchWidgetConfig;
}

export const TwitchWidget: React.FC<TwitchWidgetProps & { integrationId?: string }> = ({ config, integrationId }) => {
  const [channels, setChannels] = useState<string[]>([]);
  const [channelData, setChannelData] = useState<TwitchChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const channelList = parseChannelList(config?.channels);
    
    if (channelList.length > 0) {
      setChannels(channelList);
      return;
    }
    
    const savedChannels = localStorage.getItem('twitch_channels');
    if (savedChannels) {
      try {
        const parsed = JSON.parse(savedChannels);
        if (Array.isArray(parsed)) {
          setChannels(parsed);
        } else if (typeof parsed === 'string') {
          const list = parsed.split(',').map(c => c.trim()).filter(c => c);
          setChannels(list.length > 0 ? list : DEFAULT_CHANNELS);
        } else {
          setChannels(DEFAULT_CHANNELS);
        }
      } catch {
        setChannels(DEFAULT_CHANNELS);
      }
    } else {
      setChannels(DEFAULT_CHANNELS);
    }
  }, [config?.channels]);

  useEffect(() => {
    if (!config?.channels && channels.length > 0) {
      localStorage.setItem('twitch_channels', JSON.stringify(channels));
    }
  }, [channels, config?.channels]);

  useEffect(() => {
    const loadStreams = async () => {
      if (channels.length === 0) {
        setChannelData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchTwitchStreams({ channels, config, integrationId });
        setChannelData(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load streams');
      } finally {
        setLoading(false);
      }
    };

    loadStreams();
    const interval = setInterval(loadStreams, 60000);
    return () => clearInterval(interval);
  }, [channels, config, integrationId]);

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Twitch size={20} color="#e6e3ebff" />
          <span className="font-display">Twitch</span>
        </div>
      </div>

      {loading && channelData?.length === 0 ? (
        <div className={styles.offlineState}>Loading...</div>
      ) : error ? (
        <div className={styles.offlineState}>
          <AlertCircle size={24} color="var(--accent-red)" />
          <p style={{ fontSize: '0.8rem' }}>Check API Keys</p>
        </div>
      ) : channelData.length === 0 ? (
        <div className={styles.offlineState}>No channels found</div>
      ) : (
        <List className={styles.streamList}>
          {channelData?.map((channel) => (
            <a 
              key={channel.user_login} 
              href={`https://twitch.tv/${channel.user_login}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`${styles.streamItem} ${!channel.is_live ? styles.offline : ''}`}
            >
              <div className={styles.avatarContainer}>
                {channel.profile_image_url ? (
                  <img 
                    src={channel.profile_image_url} 
                    alt={channel.user_name} 
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <Users size={16} />
                  </div>
                )}
                {channel.is_live && <div className={styles.liveIndicator} />}
              </div>
              
              <div className={styles.streamInfo}>
                <div className={styles.rowTop}>
                  <span className={styles.streamerName}>{channel.user_name}</span>
                  {channel.is_live ? (
                    <span className={styles.viewerCount}>
                      <Users size={10} />
                      {formatViewerCount(channel.stream?.viewer_count || 0)}
                    </span>
                  ) : (
                    <span className={styles.offlineLabel}>OFFLINE</span>
                  )}
                </div>
                {channel.is_live && (
                  <div className={styles.gameName}>{channel.stream?.game_name}</div>
                )}
              </div>
            </a>
          ))}
        </List>
      )}
    </div>
  );
};
