const SENSITIVE_FIELDS = [
  'apiKey',
  'password',
  'secret',
  'token',
  'clientSecret',
  'accessToken',
  'refreshToken',
];

export const MASKED_SECRET = '********';

export function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) =>
    lowerKey.includes(field.toLowerCase()),
  );
}

export function redactSensitiveFields(
  value: Record<string, unknown>,
  mode: 'omit' | 'mask' = 'omit',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveField(key)) {
      if (mode === 'mask' && entry) result[key] = MASKED_SECRET;
      continue;
    }

    if (Array.isArray(entry)) {
      result[key] = entry.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? redactSensitiveFields(item as Record<string, unknown>, mode)
          : item,
      );
    } else if (entry && typeof entry === 'object') {
      result[key] = redactSensitiveFields(
        entry as Record<string, unknown>,
        mode,
      );
    } else {
      result[key] = entry;
    }
  }

  return result;
}
