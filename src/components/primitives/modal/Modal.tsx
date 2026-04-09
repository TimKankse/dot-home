"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

// --- Types ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  style?: React.CSSProperties;
  onOverlayDrop?: (e: React.DragEvent) => void;
  onOverlayDragOver?: (e: React.DragEvent) => void;
  lockScroll?: boolean;
}

// --- Components ---

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  size = 'md',
  className = '',
  style,
  onOverlayDrop,
  onOverlayDragOver,
  lockScroll = true
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      if (lockScroll) {
        document.body.style.overflow = 'hidden';
      }
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, lockScroll]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className={styles.overlay} 
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onDrop={onOverlayDrop}
      onDragOver={onOverlayDragOver}
      role="dialog"
      aria-modal="true"
    >
      <div className={`${styles.modal} ${styles[size]} ${className}`} style={style}>
        {children}
      </div>
    </div>,
    document.body
  );
};

export const ModalContent: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ 
  children, 
  className = '',
  style
}) => {
  return <div className={`${styles.content} ${className}`} style={style}>{children}</div>;
};

interface ModalHeaderProps {
  title: string;
  description?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ 
  title, 
  description, 
  onClose,
  children 
}) => {
  return (
    <div className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {children}
        {onClose && (
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export const ModalBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return <div className={`${styles.body} ${className}`}>{children}</div>;
};

export const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return <div className={`${styles.footer} ${className}`}>{children}</div>;
};

interface ModalSidebarProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
}

export const ModalSidebar: React.FC<ModalSidebarProps> = ({ 
  children, 
  title,
  icon,
  footer 
}) => {
  return (
    <div className={styles.sidebar}>
      {(title || icon) && (
        <div className={styles.sidebarHeader}>
          {icon}
          {typeof title === 'string' ? <span className={styles.sidebarTitle}>{title}</span> : title}
        </div>
      )}
      <nav className={styles.sidebarNav}>
        {children}
      </nav>
      {footer && <div className={styles.sidebarFooter}>{footer}</div>}
    </div>
  );
};

interface ModalSidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export const ModalSidebarItem: React.FC<ModalSidebarItemProps> = ({ 
  active, 
  icon, 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <button 
      className={`${styles.sidebarItem} ${active ? styles.active : ''} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
