/**
 * Encryption utilities for sensitive configuration values
 * 
 * Uses AES-256-GCM encryption with a server-generated key stored in .env.local
 * Encrypted values are stored in config.yml with an "enc:" prefix for identification
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCRYPTED_PREFIX = 'enc:';

/**
 * Get or create the encryption key
 * The key is derived from a secret stored in .env.local
 * If no secret exists, one is generated on first use
 */
function getEncryptionKey(): Buffer {
  const envPath = path.join(process.cwd(), '.env.local');
  let secret = process.env.CONFIG_ENCRYPTION_SECRET;
  
  if (!secret) {
    // Check if we need to generate a new secret
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/CONFIG_ENCRYPTION_SECRET=(.+)/);
      if (match) {
        secret = match[1].trim();
      }
    }
    
    if (!secret) {
      // Generate a new secret
      secret = randomBytes(32).toString('hex');
      const newLine = `\nCONFIG_ENCRYPTION_SECRET=${secret}\n`;
      
      if (fs.existsSync(envPath)) {
        fs.appendFileSync(envPath, newLine);
      } else {
        fs.writeFileSync(envPath, `# Auto-generated encryption secret for config values${newLine}`);
      }
      
      console.log('Generated new CONFIG_ENCRYPTION_SECRET');
    }
    
    // Update process.env for this session
    process.env.CONFIG_ENCRYPTION_SECRET = secret;
  }
  
  // Derive a 32-byte key from the secret
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a value
 * @param value - The plaintext value to encrypt
 * @returns Encrypted string with "enc:" prefix
 */
export function encryptValue(value: string): string {
  if (!value || value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }
  
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: enc:iv:authTag:encryptedData
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a value
 * @param encryptedValue - The encrypted string with "enc:" prefix
 * @returns Decrypted plaintext value
 */
export function decryptValue(encryptedValue: string): string {
  if (!encryptedValue || !encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
    return encryptedValue;
  }
  
  const key = getEncryptionKey();
  const parts = encryptedValue.slice(ENCRYPTED_PREFIX.length).split(':');
  
  if (parts.length !== 3) {
    console.error('Invalid encrypted value format');
    return encryptedValue;
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt value:', error);
    return encryptedValue;
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

// Fields that should be encrypted in config
const SENSITIVE_FIELDS = [
  'apiKey',
  'password',
  'secret',
  'token',
  'clientSecret',
  'accessToken',
  'refreshToken',
];

/**
 * Check if a field key represents a sensitive field
 */
export function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));
}

/**
 * Recursively encrypt sensitive fields in an object
 */
export function encryptSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = encryptSensitiveFields(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? encryptSensitiveFields(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'string' && isSensitiveField(key)) {
      result[key] = encryptValue(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Recursively decrypt sensitive fields in an object
 */
export function decryptSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = decryptSensitiveFields(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? decryptSensitiveFields(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'string' && isEncrypted(value)) {
      result[key] = decryptValue(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
