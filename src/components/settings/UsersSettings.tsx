"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock3,
  Copy,
  Eye,
  KeyRound,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { Badge, Button, Input, Label, Select } from '../primitives';
import styles from './SettingsDialog.module.css';

interface UserData {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

type UserRole = UserData['role'];
type FormMode = 'list' | 'create' | 'edit';

interface CreateUserFormState {
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
}

interface EditUserFormState {
  email: string;
  displayName: string;
  role: UserRole;
}

interface ResetLinkState {
  email: string;
  expiresAt: string;
  resetUrl: string;
}

const CREATE_USER_INITIAL_STATE: CreateUserFormState = {
  email: '',
  displayName: '',
  password: '',
  role: 'member',
};

const EDIT_USER_INITIAL_STATE: EditUserFormState = {
  email: '',
  displayName: '',
  role: 'member',
};

export const UsersSettings: React.FC = () => {
  const { data: session, update } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('list');
  const [newUser, setNewUser] = useState<CreateUserFormState>(CREATE_USER_INITIAL_STATE);
  const [editUser, setEditUser] = useState<EditUserFormState>(EDIT_USER_INITIAL_STATE);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [manualResetLink, setManualResetLink] = useState<ResetLinkState | null>(null);
  const [copiedResetLink, setCopiedResetLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingUserId, setIsResettingUserId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'admin';
  const editingUser = useMemo(
    () => users.find((user) => user.id === editingUserId) || null,
    [editingUserId, users],
  );

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setError('');
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [fetchUsers, isAdmin]);

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const resetForm = () => {
    setFormMode('list');
    setEditingUserId(null);
    setNewUser(CREATE_USER_INITIAL_STATE);
    setEditUser(EDIT_USER_INITIAL_STATE);
    clearMessages();
  };

  const formatRole = (role: UserRole) => role.charAt(0).toUpperCase() + role.slice(1);

  const formatTimestamp = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  const formatCardDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));

  const copyResetLink = async (resetUrl: string) => {
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopiedResetLink(true);
      setSuccessMessage('Reset link copied to your clipboard.');
    } catch {
      setError('Failed to copy the reset link.');
    }
  };

  const handleAddUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    clearMessages();
    setManualResetLink(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      resetForm();
      setSuccessMessage(`Created ${data.user.email}.`);
      await fetchUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: UserData) => {
    setFormMode('edit');
    setEditingUserId(user.id);
    setEditUser({
      email: user.email,
      displayName: user.displayName || '',
      role: user.role,
    });
    clearMessages();
    setManualResetLink(null);
    setCopiedResetLink(false);
  };

  const handleUpdateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUserId) {
      return;
    }

    setIsSubmitting(true);
    clearMessages();
    setManualResetLink(null);

    try {
      const response = await fetch(`/api/users/${editingUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      const isSelf = editingUserId === session?.user?.id;
      const emailChanged = editingUser?.email !== data.user.email;

      if (isSelf) {
        if (emailChanged) {
          alert('Your email changed. Please sign in again.');
          await signOut({ callbackUrl: '/login?message=profile-updated' });
          return;
        }

        await update({
          name: data.user.displayName || data.user.email,
          email: data.user.email,
        });
      }

      resetForm();
      setSuccessMessage(`Updated ${data.user.email}.`);
      await fetchUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This will also delete all their dashboards.`)) {
      return;
    }

    clearMessages();

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccessMessage(`Deleted ${email}.`);
      if (editingUserId === userId) {
        resetForm();
      }
      await fetchUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user');
    }
  };

  const handlePasswordReset = async (user: UserData) => {
    setIsResettingUserId(user.id);
    clearMessages();
    setCopiedResetLink(false);

    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create password reset');
      }

      if (data.delivery === 'manual' && data.resetUrl) {
        setManualResetLink({
          email: user.email,
          expiresAt: data.expiresAt,
          resetUrl: data.resetUrl,
        });
        setSuccessMessage(`Created a manual reset link for ${user.email}.`);
        return;
      }

      setManualResetLink(null);
      setSuccessMessage(`Queued automated reset instructions for ${user.email}.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to create password reset');
    } finally {
      setIsResettingUserId(null);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield size={14} />;
      case 'viewer':
        return <Eye size={14} />;
      default:
        return <User size={14} />;
    }
  };

  const getRoleBadgeVariant = (role: UserRole): 'success' | 'warning' | 'neutral' => {
    switch (role) {
      case 'admin':
        return 'warning';
      case 'viewer':
        return 'neutral';
      default:
        return 'success';
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin — Full access' },
    { value: 'member', label: 'Member — Can edit own dashboard' },
    { value: 'viewer', label: 'Viewer — Read only' },
  ];

  if (!isAdmin) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>User Management</div>
        <div className={styles.emptyState}>
          <Users size={32} className={styles.emptyStateIcon} />
          <p>Only administrators can manage users.</p>
        </div>
      </div>
    );
  }

  if (formMode === 'create') {
    return (
      <div className={styles.form}>
        <div className={styles.formHeader}>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetForm}
            title="Back to list"
            leftIcon={<ArrowLeft size={18} />}
          />
          <h3 className={styles.formHeaderTitle}>Add New User</h3>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

        <form onSubmit={handleAddUser}>
          <div className={styles.formGroup}>
            <Label>Email *</Label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
              required
              placeholder="user@example.com"
            />
          </div>

          <div className={styles.formGroup}>
            <Label>Display Name</Label>
            <Input
              type="text"
              value={newUser.displayName}
              onChange={(event) => setNewUser({ ...newUser, displayName: event.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className={styles.formGroup}>
            <Label>Password *</Label>
            <Input
              type="password"
              value={newUser.password}
              onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>

          <div className={styles.formGroup}>
            <Label>Role</Label>
            <Select
              value={newUser.role}
              onChange={(value) =>
                setNewUser((current) => ({
                  ...current,
                  role: value as UserRole,
                }))
              }
              options={roleOptions}
            />
          </div>

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Create User
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (formMode === 'edit' && editingUserId) {
    return (
      <div className={styles.form}>
        <div className={styles.formHeader}>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetForm}
            title="Back to list"
            leftIcon={<ArrowLeft size={18} />}
          />
          <h3 className={styles.formHeaderTitle}>Edit User</h3>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

        <form onSubmit={handleUpdateUser}>
          <div className={styles.formGroup}>
            <Label>Email *</Label>
            <Input
              type="email"
              value={editUser.email}
              onChange={(event) => setEditUser({ ...editUser, email: event.target.value })}
              required
              placeholder="user@example.com"
            />
            <p className={styles.helperText}>
              Changing an email also invalidates any outstanding reset links for this user.
            </p>
          </div>

          <div className={styles.formGroup}>
            <Label>Display Name</Label>
            <Input
              type="text"
              value={editUser.displayName}
              onChange={(event) => setEditUser({ ...editUser, displayName: event.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className={styles.formGroup}>
            <Label>Role</Label>
            <Select
              value={editUser.role}
              onChange={(value) =>
                setEditUser((current) => ({
                  ...current,
                  role: value as UserRole,
                }))
              }
              disabled={editingUserId === session?.user?.id}
              options={roleOptions}
            />
            {editingUserId === session?.user?.id && (
              <p className={styles.helperText}>
                Your role stays locked here so you do not accidentally remove your own admin access.
              </p>
            )}
          </div>

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        <span>User Management</span>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormMode('create');
            clearMessages();
            setManualResetLink(null);
            setCopiedResetLink(false);
          }}
          leftIcon={<Plus size={16} />}
        >
          Add User
        </Button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

      {manualResetLink && (
        <div className={styles.noticeBanner}>
          <div className={styles.noticeBannerHeader}>
            <span className={styles.noticeBannerTitle}>Manual Reset Link</span>
            <span className={styles.integrationType}>{manualResetLink.email}</span>
          </div>
          <div className={styles.formGroup}>
            <Label>One-time link</Label>
            <Input type="text" value={manualResetLink.resetUrl} readOnly />
          </div>
          <p className={styles.helperText}>
            This link expires on {formatTimestamp(manualResetLink.expiresAt)}. Share it securely with the user.
          </p>
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => copyResetLink(manualResetLink.resetUrl)}
              leftIcon={copiedResetLink ? <Check size={16} /> : <Copy size={16} />}
            >
              {copiedResetLink ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setManualResetLink(null);
                setCopiedResetLink(false);
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={styles.emptyState}>
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={32} className={styles.emptyStateIcon} />
          <p>No users found.</p>
        </div>
      ) : (
        <div className={styles.integrationList}>
          {users.map((user) => (
            <div key={user.id} className={styles.integrationItem}>
              <div className={styles.integrationInfo}>
                <div className={styles.integrationTitleRow}>
                  <span className={styles.integrationName}>
                    {user.displayName || user.email}
                  </span>
                  <Badge
                    variant={getRoleBadgeVariant(user.role)}
                    icon={getRoleIcon(user.role)}
                  >
                    {formatRole(user.role)}
                  </Badge>
                  {user.id === session?.user?.id && (
                    <Badge variant="neutral">
                      You
                    </Badge>
                  )}
                </div>
                <span className={styles.integrationType}>{user.email}</span>
                <div className={`${styles.integrationType} ${styles.integrationMetaRow} ${styles.userMetaRow}`}>
                  <span
                    className={styles.integrationMetaItem}
                    title={`Created ${formatTimestamp(user.createdAt)}`}
                  >
                    <Calendar size={12} /> {formatCardDate(user.createdAt)}
                  </span>
                  <span
                    className={styles.integrationMetaItem}
                    title={`Updated ${formatTimestamp(user.updatedAt)}`}
                  >
                    <Clock3 size={12} /> {formatCardDate(user.updatedAt)}
                  </span>
                </div>
              </div>

              <div className={`${styles.actions} ${styles.userActions}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditUser(user)}
                  title="Edit user"
                  leftIcon={<Pencil size={18} />}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePasswordReset(user)}
                  loading={isResettingUserId === user.id}
                  title="Create password reset"
                  leftIcon={<KeyRound size={18} />}
                />
                <Button
                  variant="danger"
                  size="icon"
                  onClick={() => handleDeleteUser(user.id, user.email)}
                  disabled={user.id === session?.user?.id}
                  leftIcon={<Trash2 size={18} />}
                  title={user.id === session?.user?.id ? "Can't delete yourself" : 'Delete user'}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
