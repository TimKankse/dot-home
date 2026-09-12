'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Ban, Eye, Pencil, X } from 'lucide-react';
import styles from './PermissionManager.module.css';
import { AccessLevelSelect, type AccessLevel } from '../ui/AccessLevelSelect';
import { apiFetch } from '@/lib/api-client';

type PermissionType = 'BLOCKED' | 'VIEW' | 'EDIT';
type ObjectType = 'dashboard' | 'page' | 'integration';

interface UserPermission {
  id: string;
  userId: string;
  permission: PermissionType;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

interface PermissionManagerProps {
  objectType: ObjectType;
  objectId: string;
  currentAccessLevel: AccessLevel;
  onAccessLevelChange: (level: AccessLevel) => void;
  canEdit: boolean;
  canManagePermissions: boolean;
}

const PERMISSION_OPTIONS: { value: PermissionType; label: string; Icon: React.ElementType }[] = [
  { value: 'BLOCKED', label: 'Blocked', Icon: Ban },
  { value: 'VIEW', label: 'View Only', Icon: Eye },
  { value: 'EDIT', label: 'Full Access', Icon: Pencil },
];

export function PermissionManager({
  objectType,
  objectId,
  currentAccessLevel,
  onAccessLevelChange,
  canEdit,
  canManagePermissions,
}: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newPermission, setNewPermission] = useState<PermissionType>('VIEW');
  const [addingUser, setAddingUser] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/permissions?objectType=${objectType}&objectId=${objectId}`
      );
      if (!res.ok) throw new Error('Failed to fetch permissions');
      const data = await res.json();
      setPermissions(data.permissions);
      setError(null);
    } catch (err) {
      setError('Failed to load permissions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [objectType, objectId]);

  useEffect(() => {
    if (canManagePermissions) fetchPermissions();
  }, [fetchPermissions, canManagePermissions]);

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return;

    setAddingUser(true);
    try {
      const userRes = await fetch(`/api/users?email=${encodeURIComponent(newUserEmail)}`);
      if (!userRes.ok) throw new Error('User not found');
      const userData = await userRes.json();

      if (!userData.user) {
        setError('User not found');
        return;
      }

      const res = await apiFetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectType,
          objectId,
          userId: userData.user.id,
          permission: newPermission,
        }),
      });

      if (!res.ok) throw new Error('Failed to add permission');

      await fetchPermissions();
      setNewUserEmail('');
      setError(null);
    } catch (err) {
      setError('Failed to add user');
      console.error(err);
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const res = await apiFetch(
        `/api/permissions?objectType=${objectType}&objectId=${objectId}&userId=${userId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Failed to remove permission');

      await fetchPermissions();
    } catch (err) {
      setError('Failed to remove user');
      console.error(err);
    }
  };

  const handleUpdatePermission = async (userId: string, permission: PermissionType) => {
    try {
      const res = await apiFetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectType,
          objectId,
          userId,
          permission,
        }),
      });

      if (!res.ok) throw new Error('Failed to update permission');

      await fetchPermissions();
    } catch (err) {
      setError('Failed to update permission');
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <AccessLevelSelect
        value={currentAccessLevel}
        onChange={onAccessLevelChange}
        disabled={!canEdit}
      />

      <div className={styles.divider} />

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>User Overrides</h4>
        <p className={styles.sectionDescription}>
          Grant or restrict access for specific users, overriding the default access level.
        </p>

        {!canManagePermissions ? (
          <p className={styles.sectionDescription}>Only the owner or an administrator can manage user access.</p>
        ) : loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            {permissions.length > 0 ? (
              <div className={styles.userList}>
                {permissions.map((perm) => (
                  <div key={perm.id} className={styles.userItem}>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>
                        {perm.user.displayName || perm.user.email}
                      </span>
                      {perm.user.displayName && (
                        <span className={styles.userEmail}>{perm.user.email}</span>
                      )}
                    </div>
                    <select
                      className={styles.permissionSelect}
                      value={perm.permission}
                      onChange={(e) =>
                        handleUpdatePermission(perm.userId, e.target.value as PermissionType)
                      }
                      disabled={!canManagePermissions}
                    >
                      {PERMISSION_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {canManagePermissions && (
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveUser(perm.userId)}
                        title="Remove override"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>No user-specific overrides</div>
            )}

            {canManagePermissions && (
              <div className={styles.addUser}>
                <input
                  type="email"
                  placeholder="User email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className={styles.emailInput}
                />
                <select
                  value={newPermission}
                  onChange={(e) => setNewPermission(e.target.value as PermissionType)}
                  className={styles.permissionSelect}
                >
                  {PERMISSION_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !newUserEmail.trim()}
                  className={styles.addButton}
                >
                  {addingUser ? '...' : 'Add'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PermissionManager;
