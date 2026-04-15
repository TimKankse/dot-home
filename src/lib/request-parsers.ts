import type { AccessLevel } from '@/utils/permissions';
import { parseStoredDashboardLayout, type DashboardLayoutData } from '@/lib/dashboard-layout';
import {
  ValidationError,
  assertRecord,
  readJsonObject,
  readOptionalBoolean,
  readOptionalEnum,
  readOptionalNumber,
  readOptionalString,
  readRequiredString,
} from '@/lib/validation';

const ACCESS_LEVELS = ['PUBLIC', 'VIEWABLE', 'PRIVATE'] as const;
const USER_ROLES = ['admin', 'member', 'viewer'] as const;

export interface ParsedDashboardSaveRequest {
  dashboardId?: string;
  layout: DashboardLayoutData;
}

export const parseDashboardSaveRequest = (
  body: unknown,
): ParsedDashboardSaveRequest => {
  const record = assertRecord(body, 'Dashboard save payload');

  if (!Array.isArray(record.widgets)) {
    throw new ValidationError('widgets array is required');
  }

  return {
    dashboardId: readOptionalString(record, 'dashboardId'),
    layout: parseStoredDashboardLayout(record),
  };
};

export const parseCreateDashboardRequest = (body: unknown) => {
  const record = assertRecord(body, 'Create dashboard payload');

  return {
    name: readOptionalString(record, 'name')?.trim() || 'New Dashboard',
  };
};

export const parseUpdateDashboardRequest = (body: unknown) => {
  const record = assertRecord(body, 'Update dashboard payload');

  return {
    name: readOptionalString(record, 'name')?.trim(),
    isDefault: readOptionalBoolean(record, 'isDefault'),
    accessLevel: readOptionalEnum(record.accessLevel, ACCESS_LEVELS) as AccessLevel | undefined,
  };
};

export const parseCreateUserRequest = (body: unknown) => {
  const record = assertRecord(body, 'Create user payload');

  return {
    email: readRequiredString(record, 'email', 'Email').trim().toLowerCase(),
    displayName: readOptionalString(record, 'displayName')?.trim(),
    password: readRequiredString(record, 'password', 'Password'),
    role: (readOptionalEnum(record.role, USER_ROLES) ?? 'member') as typeof USER_ROLES[number],
  };
};

export const parseSetupRequest = (body: unknown) => {
  const record = assertRecord(body, 'Setup payload');

  return {
    email: readRequiredString(record, 'email', 'Email').trim().toLowerCase(),
    displayName: readOptionalString(record, 'displayName')?.trim(),
    password: readRequiredString(record, 'password', 'Password'),
  };
};

export const parseCreatePageRequest = (body: unknown) => {
  const record = assertRecord(body, 'Create page payload');

  return {
    dashboardId: readRequiredString(record, 'dashboardId', 'dashboardId'),
    name: readOptionalString(record, 'name')?.trim() || 'Page',
    accessLevel: (readOptionalEnum(record.accessLevel, ACCESS_LEVELS) ?? 'PRIVATE') as AccessLevel,
  };
};

export const parseUpdatePageRequest = (body: unknown) => {
  const record = assertRecord(body, 'Update page payload');

  return {
    name: readOptionalString(record, 'name')?.trim(),
    accessLevel: readOptionalEnum(record.accessLevel, ACCESS_LEVELS) as AccessLevel | undefined,
    sortOrder: readOptionalNumber(record, 'sortOrder'),
  };
};

export const parseWidgetUserConfigRequest = (body: unknown) => {
  const record = assertRecord(body, 'Widget config payload');

  return {
    config: readJsonObject(record, 'config', 'config'),
  };
};
