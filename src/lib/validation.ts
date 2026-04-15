export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const assertRecord = (value: unknown, label: string): JsonRecord => {
  if (!isRecord(value)) {
    throw new ValidationError(`${label} must be an object`);
  }

  return value;
};

export const readOptionalString = (
  record: JsonRecord,
  key: string,
): string | undefined => (typeof record[key] === 'string' ? record[key] : undefined);

export const readRequiredString = (
  record: JsonRecord,
  key: string,
  label: string,
): string => {
  const value = readOptionalString(record, key);

  if (!value) {
    throw new ValidationError(`${label} is required`);
  }

  return value;
};

export const readOptionalBoolean = (
  record: JsonRecord,
  key: string,
): boolean | undefined => (typeof record[key] === 'boolean' ? record[key] : undefined);

export const readOptionalNumber = (
  record: JsonRecord,
  key: string,
): number | undefined => {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

export const readEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`Invalid ${label}`);
  }

  return value as T;
};

export const readOptionalEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return allowed.includes(value as T) ? (value as T) : undefined;
};

export const readJsonObject = (
  record: JsonRecord,
  key: string,
  label: string,
): JsonRecord => {
  const value = record[key];

  if (!isRecord(value)) {
    throw new ValidationError(`${label} must be an object`);
  }

  return value;
};

export const tryParseJsonString = (value: string, fallback: unknown): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
