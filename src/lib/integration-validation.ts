import type { IntegrationType } from '@/types/integration';
import {
  ValidationError,
  assertRecord,
  readJsonObject,
  readRequiredString,
  type JsonRecord,
} from '@/lib/validation';

export const INTEGRATION_TYPES = [
  'jellyfin',
  'jellyseerr',
  'netdata',
  'portainer',
  'sabnzbd',
  'qbittorrent',
  'twitch',
  'sonarr',
  'radarr',
  'rss',
] as const satisfies readonly IntegrationType[];

type FieldKind = 'url' | 'secret' | 'secret-url' | 'identifier';
type FieldSpec = { kind: FieldKind; required?: boolean };

const CONFIG_SPECS: Record<IntegrationType, Record<string, FieldSpec>> = {
  jellyfin: {
    url: { kind: 'url', required: true },
    apiKey: { kind: 'secret', required: true },
    userId: { kind: 'identifier' },
  },
  jellyseerr: {
    url: { kind: 'url', required: true },
    apiKey: { kind: 'secret', required: true },
  },
  netdata: {
    url: { kind: 'url', required: true },
  },
  portainer: {
    url: { kind: 'url', required: true },
    apiKey: { kind: 'secret', required: true },
    endpointId: { kind: 'identifier' },
  },
  sabnzbd: {
    url: { kind: 'url', required: true },
    apiKey: { kind: 'secret', required: true },
  },
  qbittorrent: {
    url: { kind: 'url', required: true },
    username: { kind: 'identifier' },
    password: { kind: 'secret' },
  },
  twitch: {
    clientId: { kind: 'identifier', required: true },
    clientSecret: { kind: 'secret', required: true },
  },
  sonarr: {
    url: { kind: 'url', required: true },
    apiKey: { kind: 'secret', required: true },
  },
  radarr: {
    url: { kind: 'url', required: true },
    apiKey: { kind: 'secret', required: true },
  },
  rss: {
    secretUrl: { kind: 'secret-url', required: true },
  },
};

const MASKED_SECRET = '********';
const MAX_NAME_LENGTH = 100;
const MAX_URL_LENGTH = 2048;
const MAX_IDENTIFIER_LENGTH = 512;
const MAX_SECRET_LENGTH = 4096;

const parseIntegrationType = (value: unknown): IntegrationType => {
  if (typeof value !== 'string' || !INTEGRATION_TYPES.includes(value as IntegrationType)) {
    throw new ValidationError('Unsupported integration type');
  }
  return value as IntegrationType;
};

const parseName = (record: JsonRecord): string => {
  const name = readRequiredString(record, 'name', 'Integration name').trim();
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`Integration name must be between 1 and ${MAX_NAME_LENGTH} characters`);
  }
  return name;
};

const parseStringField = (
  value: unknown,
  field: string,
  spec: FieldSpec,
): string | undefined => {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }

  if (spec.kind === 'secret') {
    if (value.length > MAX_SECRET_LENGTH) {
      throw new ValidationError(`${field} is too long`);
    }
    return value;
  }

  const normalized = value.trim();
  if (!normalized) return undefined;
  if (spec.kind === 'identifier') {
    if (normalized.length > MAX_IDENTIFIER_LENGTH) {
      throw new ValidationError(`${field} is too long`);
    }
    return normalized;
  }

  if (normalized.length > MAX_URL_LENGTH) {
    throw new ValidationError(`${field} is too long`);
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new ValidationError(`${field} must be a valid HTTP or HTTPS URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ValidationError(`${field} must be a valid HTTP or HTTPS URL`);
  }
  if (spec.kind === 'url' && (url.username || url.password)) {
    throw new ValidationError(`${field} must be a valid HTTP or HTTPS URL without embedded credentials`);
  }
  return normalized;
};

export const parseIntegrationConfig = (
  type: IntegrationType,
  value: unknown,
  existingConfig: JsonRecord = {},
): JsonRecord => {
  const input = assertRecord(value, 'Integration config');
  const spec = CONFIG_SPECS[type];
  const allowedInputFields = new Set([...Object.keys(spec), 'externalUrl']);

  for (const field of Object.keys(input)) {
    if (!allowedInputFields.has(field)) {
      throw new ValidationError(`Unsupported ${type} config field: ${field}`);
    }
  }

  const normalizedInput = { ...input };
  if (normalizedInput.url === undefined && normalizedInput.externalUrl !== undefined) {
    normalizedInput.url = normalizedInput.externalUrl;
  }
  delete normalizedInput.externalUrl;

  const result: JsonRecord = {};
  for (const [field, fieldSpec] of Object.entries(spec)) {
    let inputValue = normalizedInput[field];
    const preserveStoredSecret = (fieldSpec.kind === 'secret' || fieldSpec.kind === 'secret-url')
      && (inputValue === undefined || inputValue === MASKED_SECRET);

    if (preserveStoredSecret) inputValue = existingConfig[field];

    const parsed = parseStringField(inputValue, field, fieldSpec);
    if (parsed !== undefined) result[field] = parsed;
    if (fieldSpec.required && parsed === undefined) {
      throw new ValidationError(`${field} is required for ${type}`);
    }
  }

  if (
    type === 'qbittorrent' &&
    result.username === undefined &&
    normalizedInput.password === undefined &&
    typeof existingConfig.username === 'string' &&
    typeof result.password === 'string'
  ) {
    result.username = existingConfig.username;
  }

  if (type === 'qbittorrent' && Boolean(result.username) !== Boolean(result.password)) {
    throw new ValidationError('qBittorrent username and password must be provided together');
  }

  return result;
};

export type ParsedIntegrationMutation = {
  name: string;
  type: IntegrationType;
  config: JsonRecord;
};

export const parseIntegrationId = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 128) {
    throw new ValidationError('Invalid integration ID');
  }
  return value.trim();
};

export const parseCreateIntegrationRequest = (body: unknown): ParsedIntegrationMutation => {
  const record = assertRecord(body, 'Create integration payload');
  const type = parseIntegrationType(record.type);
  return {
    name: parseName(record),
    type,
    config: parseIntegrationConfig(type, readJsonObject(record, 'config', 'config')),
  };
};

export const parseUpdateIntegrationRequest = (
  body: unknown,
  existingType: IntegrationType,
  existingConfig: JsonRecord,
): ParsedIntegrationMutation & { id: string } => {
  const record = assertRecord(body, 'Update integration payload');
  const id = parseIntegrationId(record.id);

  const type = parseIntegrationType(record.type);
  if (type !== existingType) {
    throw new ValidationError('An integration type cannot be changed');
  }

  return {
    id,
    name: parseName(record),
    type,
    config: parseIntegrationConfig(
      type,
      readJsonObject(record, 'config', 'config'),
      existingConfig,
    ),
  };
};
