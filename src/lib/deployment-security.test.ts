// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let directory: string;
let config: string;
let bin: string;
let entrypoint: string;
let capture: string;
const mode = (file: string) => statSync(file).mode & 0o777;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'dothome-startup-test-'));
  config = path.join(directory, 'config');
  bin = path.join(directory, 'bin');
  entrypoint = path.join(directory, 'entrypoint.sh');
  capture = path.join(directory, 'captured-secret');
  mkdirSync(config);
  mkdirSync(bin);
  writeFileSync(entrypoint, readFileSync('docker-entrypoint.sh', 'utf8').replace('CONFIG_DIR="/app/config"', `CONFIG_DIR="${config}"`));
  writeFileSync(path.join(bin, 'prisma'), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  writeFileSync(path.join(bin, 'node'), '#!/bin/sh\nprintf "%s" "$NEXTAUTH_SECRET" > "$TEST_CAPTURE"\n', { mode: 0o700 });
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

function start(secret = '') {
  execFileSync('/bin/sh', [entrypoint], {
    env: {
      ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_CAPTURE: capture,
      NEXTAUTH_SECRET: secret, CONFIG_ENCRYPTION_SECRET: '', BOOTSTRAP_SECRET: '',
    },
    stdio: 'pipe',
  });
}

describe('container secret initialization', () => {
  it('prepares a private SQLite file without truncating an existing database', () => {
    const database = path.join(directory, 'new-install', 'dothome.db');
    const prepare = () => execFileSync(process.execPath, ['scripts/prepare-database.mjs'], {
      env: { ...process.env, DATABASE_URL: `file:${database}` }, stdio: 'pipe',
    });
    prepare();
    expect(mode(database)).toBe(0o600);
    writeFileSync(database, 'existing-database-content');
    prepare();
    expect(readFileSync(database, 'utf8')).toBe('existing-database-content');
  });

  it('creates private persistent secrets and reuses them across starts', () => {
    start();
    const first = readFileSync(capture, 'utf8');
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(mode(config)).toBe(0o700);
    for (const name of ['.nextauth_secret', '.config_encryption_secret', '.bootstrap_secret']) {
      expect(mode(path.join(config, name))).toBe(0o600);
    }
    start();
    expect(readFileSync(capture, 'utf8') === first).toBe(true);
  });

  it('honors an explicit authentication secret instead of the persisted value', () => {
    writeFileSync(path.join(config, '.nextauth_secret'), 'old-test-secret');
    start('explicit-test-secret');
    expect(readFileSync(capture, 'utf8')).toBe('explicit-test-secret');
    expect(readFileSync(path.join(config, '.nextauth_secret'), 'utf8')).toBe('old-test-secret');
  });

  it('repairs permissive existing runtime files without changing their contents', () => {
    chmodSync(config, 0o777);
    const files = ['.nextauth_secret', 'dothome.db', 'dothome.db-wal', 'dothome.db.bak'];
    for (const name of files) {
      const file = path.join(config, name);
      writeFileSync(file, 'test-content');
      chmodSync(file, 0o777);
    }
    start();
    expect(mode(config)).toBe(0o700);
    for (const name of files) {
      expect(mode(path.join(config, name))).toBe(0o600);
      expect(readFileSync(path.join(config, name), 'utf8')).toBe('test-content');
    }
  });
});
