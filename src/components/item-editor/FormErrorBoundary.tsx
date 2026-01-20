'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional label for the section that errored */
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary for form sections in the item editor.
 * Catches errors in config/appearance tabs and displays a friendly message
 * instead of crashing the entire dialog.
 */
export class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('Form Section Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { sectionName = 'Section' } = this.props;
      
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          gap: '12px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--background-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          margin: '8px 0',
        }}>
          <AlertTriangle 
            size={28} 
            style={{ color: 'var(--color-warning, #f59e0b)' }} 
          />
          <div style={{ 
            fontFamily: 'var(--font-body)', 
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            {sectionName} failed to load
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.75rem',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: 0.7,
              padding: '0 8px',
            }}>
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-body)',
              background: 'var(--background-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'background 0.15s ease, border-color 0.15s ease',
              marginTop: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--background-tertiary)';
              e.currentTarget.style.borderColor = 'var(--border-color-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--background-primary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
