import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';

const BOOTSTRAP_SECRET_FILENAME = '.bootstrap_secret';
const MINIMUM_SECRET_BYTES = 24;

function getPersistentSecretPath(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith('file:')) {
    throw new Error('A file-backed DATABASE_URL is required for persistent bootstrap security');
  }

  const configuredPath = databaseUrl.slice('file:'.length).split('?')[0];
  const databasePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), 'prisma', configuredPath);

  return path.join(path.dirname(databasePath), BOOTSTRAP_SECRET_FILENAME);
}

function readSecretFile(secretPath: string): string {
  return fs.readFileSync(secretPath, 'utf8').trim();
}

function createPersistentSecret(secretPath: string): string {
  const generated = randomBytes(32).toString('base64url');
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });

  try {
    fs.writeFileSync(secretPath, `${generated}\n`, { flag: 'wx', mode: 0o600 });
    return generated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return readSecretFile(secretPath);
    }
    throw error;
  }
}

export function getBootstrapSecret(): string {
  const configured = process.env.BOOTSTRAP_SECRET?.trim();
  if (configured) {
    if (Buffer.byteLength(configured) < MINIMUM_SECRET_BYTES) {
      throw new Error(`BOOTSTRAP_SECRET must be at least ${MINIMUM_SECRET_BYTES} bytes`);
    }
    return configured;
  }

  const secretPath = getPersistentSecretPath();
  const persisted = fs.existsSync(secretPath)
    ? readSecretFile(secretPath)
    : createPersistentSecret(secretPath);

  if (Buffer.byteLength(persisted) < MINIMUM_SECRET_BYTES) {
    throw new Error('Persisted bootstrap secret is invalid');
  }

  return persisted;
}

export function verifyBootstrapSecret(candidate: string): boolean {
  if (!candidate) return false;

  const expectedDigest = createHash('sha256').update(getBootstrapSecret()).digest();
  const candidateDigest = createHash('sha256').update(candidate).digest();
  return timingSafeEqual(expectedDigest, candidateDigest);
}
