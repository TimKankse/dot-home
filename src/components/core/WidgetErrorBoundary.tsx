'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}


export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Widget Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '12px',
          padding: '16px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <AlertTriangle 
            size={32} 
            style={{ color: 'var(--color-danger, #ef4444)' }} 
          />
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.75rem',
            opacity: 0.8
          }}>
            Widget Error
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.625rem',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: 0.6
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
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-body)',
              background: 'var(--background-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--background-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--background-secondary)';
            }}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
