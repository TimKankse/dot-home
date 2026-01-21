"use client";

import React, { useEffect, useState } from 'react';
import { Check, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '../primitives';
import pkg from '../../../package.json';
import styles from './DotHomeVersionCard.module.css';
import Image from 'next/image';

interface ReleaseData {
  tag_name: string;
  html_url: string;
}

export const DotHomeVersionCard: React.FC = () => {
  const currentVersion = pkg.version;
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/TimKankse/dot-home/releases/latest');
        if (!response.ok) {
          throw new Error('Failed to fetch release');
        }
        const data: ReleaseData = await response.json();
        setLatestVersion(data.tag_name);
        setReleaseUrl(data.html_url);
      } catch (err) {
        console.error('Error checking version:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestRelease();
  }, []);

  // Clean tag name (remove 'v' prefix if present)
  const cleanVersion = (ver: string) => ver.startsWith('v') ? ver.substring(1) : ver;
  
  const isUpdateAvailable = latestVersion && cleanVersion(latestVersion) !== cleanVersion(currentVersion);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <Image 
            src="/dotHome-icon.png" 
            alt="dotHome" 
            width={32} 
            height={32}
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div className={styles.info}>
          <h4 className={styles.title}>dotHome</h4>
          <p className={styles.version}>v{currentVersion}</p>
        </div>
      </div>
      <div className={styles.status}>
        {loading ? (
          <>
             <Badge variant="neutral" icon={<Loader2 size={12} className="animate-spin" />}>
              Checking...
            </Badge>
            <span className={styles.statusText}>Checking for updates</span>
          </>
        ) : error ? (
           <>
             <Badge variant="warning" icon={<AlertCircle size={12} />}>
              Unknown
            </Badge>
            <span className={styles.statusText}>Could not check for updates</span>
          </>
        ) : isUpdateAvailable ? (
          <>
            <a href={releaseUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Badge variant="neutral" icon={<Download size={12} />}>
                Update available
              </Badge>
            </a>
            <span className={styles.statusText}>Version {latestVersion} is available</span>
          </>
        ) : (
          <>
            <Badge variant="success" icon={<Check size={12} />}>
              Up to date
            </Badge>
            <span className={styles.statusText}>You are running the latest version</span>
          </>
        )}
      </div>
    </div>
  );
};
