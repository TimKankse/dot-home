import React from 'react';
import { Modal, ModalBody, ModalHeader, ModalContent } from '@/components/primitives/modal/Modal';
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

  return (
    <Modal isOpen={true} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader 
          title={name} 
          description={shortId} 
          onClose={onClose} 
        />
        <ModalBody>
          <div className={styles.contentContainer}>
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
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
