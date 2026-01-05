"use client";

import React, { useState, useEffect } from 'react';
import { Twitch, Users, Trash2, Plus, AlertCircle } from 'lucide-react';
import styles from './TwitchWidget.module.css';

interface TwitchChannelData {
  user_login: string;
  user_name: string;
  profile_image_url: string;
  is_live: boolean;
  stream?: {
    game_name: string;
    viewer_count: number;
    title: string;
  };
}

interface TwitchWidgetProps {
  isEditing?: boolean;
  config?: {
    clientId?: string;
    clientSecret?: string;
    channels?: string[];
  };
}

export const TwitchWidget: React.FC<TwitchWidgetProps> = ({ isEditing = false, config }) => {
  const [channels, setChannels] = useState<string[]>([]);
  const [channelData, setChannelData] = useState<TwitchChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChannel, setNewChannel] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load channels from config or localStorage on mount
  useEffect(() => {
    if (config?.channels && config.channels.length > 0) {
      setChannels(config.channels);
    } else {
      const savedChannels = localStorage.getItem('twitch_channels');
      if (savedChannels) {
        setChannels(JSON.parse(savedChannels));
      } else {
        // Default channels if none saved
        setChannels(['riotgames', 'shroud', 'tarik']); 
      }
    }
  }, [config?.channels]);

  // Save channels to localStorage whenever they change (only if not using config)
  useEffect(() => {
    if (!config?.channels && channels.length > 0) {
        localStorage.setItem('twitch_channels', JSON.stringify(channels));
    }
  }, [channels, config?.channels]);

  // Fetch streams
  useEffect(() => {
    const fetchStreams = async () => {
      if (channels.length === 0) {
        setChannelData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/twitch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            channels,
            clientId: config?.clientId,
            clientSecret: config?.clientSecret
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch Twitch data');
        }

        const data = await response.json();
        // Sort: Live first, then by name
        const sorted = (data.data || []).sort((a: TwitchChannelData, b: TwitchChannelData) => {
            if (a.is_live && !b.is_live) return -1;
            if (!a.is_live && b.is_live) return 1;
            return a.user_name.localeCompare(b.user_name);
        });
        setChannelData(sorted);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load streams');
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
    // Poll every 60 seconds
    const interval = setInterval(fetchStreams, 60000);
    return () => clearInterval(interval);
  }, [channels]);

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannel.trim() && !channels.includes(newChannel.trim().toLowerCase())) {
      setChannels([...channels, newChannel.trim().toLowerCase()]);
      setNewChannel('');
    }
  };

  const handleRemoveChannel = (channelToRemove: string) => {
    setChannels(channels.filter(c => c !== channelToRemove));
  };

  const formatViewers = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (isEditing) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Twitch size={20} color="#ece9f0ff" />
            <span className="font-display">Twitch Config</span>
          </div>
        </div>
        <div className={styles.editContainer}>
          <form onSubmit={handleAddChannel} className={styles.addChannelForm}>
            <input
              type="text"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              placeholder="Channel name..."
              className={styles.input}
            />
            <button type="submit" className={styles.addButton}>
              <Plus size={16} />
            </button>
          </form>
          <div className={styles.channelList}>
            {channels.map(channel => (
              <div key={channel} className={styles.channelItem}>
                <span className="font-mono">{channel}</span>
                <button 
                  onClick={() => handleRemoveChannel(channel)}
                  className={styles.removeButton}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className={styles.widgetContainer}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Twitch size={20} color="#e6e3ebff" />
          <span className="font-display">Twitch</span>
        </div>
      </div>

      {loading && channelData.length === 0 ? (
        <div className={styles.offlineState}>Loading...</div>
      ) : error ? (
        <div className={styles.offlineState}>
            <AlertCircle size={24} color="var(--accent-red)" />
            <p style={{ fontSize: '0.8rem' }}>Check API Keys</p>
        </div>
      ) : channelData.length === 0 ? (
        <div className={styles.offlineState}>No channels found</div>
      ) : (
        <div className={`no-scrollbar ${styles.streamList}`}>
          {channelData.map((channel) => (
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
                            {formatViewers(channel.stream?.viewer_count || 0)}
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
        </div>
      )}
    </div>
  );
};
