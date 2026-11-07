/**
 * Idempotent migration runner for the hand-maintained ./drizzle/*.sql files.
 *
 * drizzle-kit migrate does not apply the hand-written migrations in this
 * project (its journal runner applies nothing, see REVIEW.md), so this script
 * executes the files in tag order and records each applied hash in
 * __drizzle_migrations, for both fresh and existing databases.
 */
import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const url = (process.env.DATABASE_URL || 'file:./dev.db').replace(/^file:/, '');
const dir = join(process.cwd(), 'drizzle');

const db = new Database(url);
db.pragma('journal_mode = WAL');

db.exec(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL,
  created_at NUMERIC NOT NULL
)`);

const applied = new Set(
  db.prepare('SELECT hash FROM __drizzle_migrations').all().map((r: { hash: string }) => r.hash)
);

const sqlFiles = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of sqlFiles) {
  const path = join(dir, file);
  const content = readFileSync(path, 'utf8');
  const hash = createHash('sha256').update(content).digest('hex');
  if (applied.has(hash)) {
    console.log(`= ${file} already applied, skipping`);
    continue;
  }
  // Run each migration in a transaction so a failure leaves the DB untouched.
  db.transaction(() => {
    db.exec(content);
  })();
  db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(hash, statSync(path).mtimeMs);
  console.log(`+ ${file} applied`);
}

db.close();
console.log('Migrations up to date.');
