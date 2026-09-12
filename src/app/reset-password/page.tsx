"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import styles from '../(auth)/auth.module.css';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('This reset link is missing its token.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setIsSubmitting(false);
      setSuccessMessage('Password reset complete. Redirecting to sign in...');
      setTimeout(() => {
        router.push('/login?message=password-reset');
      }, 1000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reset password');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.logo}>dotHome</h1>
          <p className={styles.subtitle}>Choose a new password</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {successMessage && (
            <div className={styles.success}>{successMessage}</div>
          )}

          {errorMessage && (
            <div className={styles.error}>{errorMessage}</div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className={styles.input}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your new password"
              className={styles.input}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className={styles.button} disabled={isSubmitting || Boolean(successMessage)}>
            {isSubmitting ? (
              <>
                <span className={styles.spinner} />
                Resetting password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <Link href="/login" className={styles.link}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.logo}>dotHome</h1>
          <p className={styles.subtitle}>Loading reset link...</p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
