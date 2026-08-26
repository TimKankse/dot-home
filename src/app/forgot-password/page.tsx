"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from '../(auth)/auth.module.css';

type DeliveryMode = 'automated' | 'admin';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | null>(null);
  const [adminContactEmail, setAdminContactEmail] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start password reset');
      }

      setDeliveryMode(data.delivery as DeliveryMode);
      setAdminContactEmail(data.adminContactEmail || null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start password reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const successMessage = deliveryMode === 'automated'
    ? 'If an account exists for that email, reset instructions have been sent through the configured automation.'
    : 'If an account exists for that email, contact your administrator for a reset link.';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.logo}>dotHome</h1>
          <p className={styles.subtitle}>Reset your password</p>
        </div>

        {deliveryMode ? (
          <>
            <div className={styles.success}>{successMessage}</div>
            {deliveryMode === 'admin' && adminContactEmail && (
              <div className={styles.footer}>
                <p className={styles.footerText}>
                  Admin contact: <span className={styles.link}>{adminContactEmail}</span>
                </p>
              </div>
            )}
            <div className={styles.footer}>
              <Link href="/login" className={styles.link}>
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className={styles.form}>
              {errorMessage && (
                <div className={styles.error}>{errorMessage}</div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={styles.input}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <button type="submit" className={styles.button} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner} />
                    Sending request...
                  </>
                ) : (
                  'Request Reset'
                )}
              </button>
            </form>

            <div className={styles.footer}>
              <Link href="/login" className={styles.link}>
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
