"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Plus, Trash2, Shield, User, Eye, ArrowLeft } from 'lucide-react';
import { Button, Input, Select, Label } from '../primitives';
import styles from './SettingsDialog.module.css';

interface UserData {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
}

type FormMode = 'list' | 'create';

export const UsersSettings: React.FC = () => {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('list');
  const [newUser, setNewUser] = useState({ email: '', displayName: '', password: '', role: 'member' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const resetForm = () => {
    setFormMode('list');
    setNewUser({ email: '', displayName: '', password: '', role: 'member' });
    setError('');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This will also delete all their dashboards.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield size={14} />;
      case 'member': return <User size={14} />;
      case 'viewer': return <Eye size={14} />;
      default: return <User size={14} />;
    }
  };

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
          <Button variant="ghost" size="icon" onClick={resetForm} title="Back to list" leftIcon={<ArrowLeft size={18} />} />
          <h3 className={styles.formHeaderTitle}>Add New User</h3>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            {error}
          </div>
        )}

        <form onSubmit={handleAddUser}>
          <div className={styles.formGroup}>
            <Label>Email *</Label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
              placeholder="user@example.com"
            />
          </div>

          <div className={styles.formGroup}>
            <Label>Display Name</Label>
            <Input
              type="text"
              value={newUser.displayName}
              onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className={styles.formGroup}>
            <Label>Password *</Label>
            <Input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>

          <div className={styles.formGroup}>
            <Label>Role</Label>
            <Select
              value={newUser.role}
              onChange={(val) => setNewUser({ ...newUser, role: val })}
              options={[
                { value: 'admin', label: 'Admin — Full access' },
                { value: 'member', label: 'Member — Can edit own dashboard' },
                { value: 'viewer', label: 'Viewer — Read only' },
              ]}
            />
          </div>

          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Create User
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
          onClick={() => setFormMode('create')}
          leftIcon={<Plus size={16} />}
        >
          Add User
        </Button>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error}
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
              <div className={styles.userSummary}>
                <div className={styles.userAvatar}>
                  {getRoleIcon(user.role)}
                </div>
                <div className={styles.integrationInfo}>
                  <span className={styles.integrationName}>
                    {user.displayName || user.email}
                  </span>
                  <span className={styles.integrationType}>
                    {user.email}
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                <div className={styles.selectControlCompact}>
                  <Select
                    value={user.role}
                    onChange={(val) => handleRoleChange(user.id, val)}
                    disabled={user.id === session?.user?.id}
                    options={[
                      { value: 'admin', label: 'Admin' },
                      { value: 'member', label: 'Member' },
                      { value: 'viewer', label: 'Viewer' },
                    ]}
                  />
                </div>

                <Button
                  variant="danger"
                  size="icon"
                  onClick={() => handleDeleteUser(user.id, user.email)}
                  disabled={user.id === session?.user?.id}
                  title={user.id === session?.user?.id ? "Can't delete yourself" : 'Delete user'}
                  leftIcon={<Trash2 size={18} />}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
