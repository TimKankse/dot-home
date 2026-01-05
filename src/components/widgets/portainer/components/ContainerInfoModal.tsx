import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './ContainerInfoModal.module.css';

interface PortainerContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports: Array<{ PrivatePort: number; PublicPort?: number; Type: string }>;
  NetworkSettings?: {
    Networks: Record<string, { IPAddress: string }>;
  };
}

interface ContainerInfoModalProps {
  container: PortainerContainer;
  onClose: () => void;
}

export const ContainerInfoModal: React.FC<ContainerInfoModalProps> = ({ container, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => {
      clearTimeout(timer); 
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (mounted) {
        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClickOutside);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, mounted]);

  if (!mounted) return null;

  const name = container.Names[0].replace(/^\//, '');
  const shortId = container.Id.substring(0, 12);
  const createdDate = new Date(container.Created * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusColor = (state: string) => {
    if (state === 'running') return styles.running;
    if (state === 'exited') return styles.stopped;
    return styles.unhealthy;
  };

  // Extract IP address (take the first network found)
  const networks = container.NetworkSettings?.Networks || {};
  const ipAddress = Object.values(networks)[0]?.IPAddress || 'N/A';

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{name}</h2>
            <span className={styles.id}>{shortId}</span>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Status</span>
              <div className={styles.statusValue}>
                <div className={`${styles.statusDot} ${getStatusColor(container.State)}`} />
                <span className={styles.value} style={{ textTransform: 'capitalize' }}>
                  {container.State}
                </span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.label}>Uptime</span>
              <span className={styles.value}>{container.Status}</span>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Details</span>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Image</span>
                <span className={styles.value} title={container.Image}>{container.Image}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Created</span>
                <span className={styles.value}>{createdDate}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>IP Address</span>
                <span className={styles.value}>{ipAddress}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Network</span>
                <span className={styles.value}>
                  {Object.keys(networks).join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>

          {container.Ports && container.Ports.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Ports</span>
              <div className={styles.portsList}>
                {container.Ports.map((port, idx) => (
                  <div key={idx} className={styles.portTag}>
                    {port.PublicPort ? `${port.PublicPort}:` : ''}{port.PrivatePort}/{port.Type}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
