"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Button, Input } from '../primitives';
import styles from './SettingsDialog.module.css';

interface ProfileData {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export const ProfileSettings: React.FC = () => {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setProfile(data.user);
      setDisplayName(data.user.displayName || '');
      setProfileError('');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfile(data.user);
      setDisplayName(data.user.displayName || '');
      setProfileSuccess('Profile updated.');
      await update({
        name: data.user.displayName || data.user.email,
        email: data.user.email,
      });
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordSuccess('Password updated. Signing you out...');
      setTimeout(() => {
        signOut({ callbackUrl: '/login?message=password-changed' });
      }, 600);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Profile</div>
        <div className={styles.emptyState}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Profile</div>
        {profileError && (
          <div className={styles.errorBanner}>
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className={styles.successBanner}>
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleProfileSave}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Display Name</span>
              <span className={styles.settingDesc}>
                The name shown around the app and in shared spaces.
              </span>
            </div>
            <div className={styles.controlLg}>
              <Input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Email</span>
              <span className={styles.settingDesc}>
                {profile?.role === 'admin'
                  ? 'Use the Users tab if you need to correct an email address.'
                  : 'Contact an admin if your email needs to change.'}
              </span>
            </div>
            <div className={styles.controlLg}>
              <Input
                type="email"
                value={profile?.email || session?.user?.email || ''}
                readOnly
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" loading={isSavingProfile}>
              Save Profile
            </Button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Security</div>
        {passwordError && (
          <div className={styles.errorBanner}>
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className={styles.successBanner}>
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Current Password</span>
              <span className={styles.settingDesc}>
                Confirm it&apos;s really you before changing credentials.
              </span>
            </div>
            <div className={styles.controlLg}>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                required
                placeholder="Current password"
              />
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>New Password</span>
              <span className={styles.settingDesc}>
                Use at least 8 characters.
              </span>
            </div>
            <div className={styles.controlLg}>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Confirm Password</span>
              <span className={styles.settingDesc}>
                You&apos;ll be signed out after the password is updated.
              </span>
            </div>
            <div className={styles.controlLg}>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                required
                minLength={8}
                placeholder="Repeat the new password"
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" loading={isChangingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
