import fs from 'node:fs';
import path from 'node:path';

// Prisma 6's SQLite schema engine can fail to open a database that does not
// exist yet. Create it exclusively; never truncate an existing installation.
const url = process.env.DATABASE_URL;
if (url?.startsWith('file:')) {
  const configured = url.slice(5).split('?')[0];
  const file = path.isAbsolute(configured) ? configured : path.resolve('prisma', configured);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  try { fs.closeSync(fs.openSync(file, 'ax', 0o600)); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
