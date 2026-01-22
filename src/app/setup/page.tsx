"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import styles from '../(auth)/auth.module.css';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'check' | 'create' | 'done'>('check');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Check if setup is needed
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/setup/check');
        const data = await res.json();
        if (!data.needsSetup) {
          // Already has users, redirect to login
          router.push('/login');
        } else {
          setStep('create');
        }
      } catch {
        setErrorMessage('Failed to check setup status');
      }
    };
    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          displayName: displayName || undefined,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Auto sign in
      const signInResult = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setErrorMessage('Account created but login failed. Please go to login page.');
        setIsLoading(false);
        return;
      }

      setStep('done');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch {
      setErrorMessage('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (step === 'check') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.logo}>dotHome</h1>
            <p className={styles.subtitle}>Checking setup status...</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
            <span className={styles.spinner} style={{ width: 32, height: 32 }} />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.welcomeIcon}>✓</div>
            <h1 className={styles.logo}>All Set!</h1>
            <p className={styles.subtitle}>Redirecting to your dashboard...</p>
          </div>
          <div className={styles.success}>
            Account created successfully
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.logo}>dotHome</h1>
          <p className={styles.subtitle}>Create your admin account to get started</p>
        </div>

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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className={styles.input}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="displayName" className={styles.label}>Display Name (optional)</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Admin"
              className={styles.input}
              autoComplete="name"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={styles.input}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Creating account...
              </>
            ) : (
              'Create Admin Account'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            This account will have full admin access to manage users and all dashboard widgets.
          </p>
        </div>
      </div>
    </div>
  );
}
