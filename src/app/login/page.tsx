"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../(auth)/auth.module.css';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error ? 'Invalid email or password' : '');
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    // Check if any users exist
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/setup/check');
        const data = await res.json();
        if (data.needsSetup) {
          setNeedsSetup(true);
        }
      } catch {
        // Ignore errors, assume setup not needed
      }
    };
    checkSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage('Invalid email or password');
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setErrorMessage('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (needsSetup) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.logo}>dotHome</h1>
            <p className={styles.subtitle}>Welcome! Let's set up your dashboard.</p>
          </div>
          <Link 
            href="/setup" 
            className={styles.button}
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.logo}>dotHome</h1>
          <p className={styles.subtitle}>Sign in to your dashboard</p>
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
              placeholder="you@example.com"
              className={styles.input}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.logo}>dotHome</h1>
          <p className={styles.subtitle}>Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
