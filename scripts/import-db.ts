/**
 * Database import/restore (Milestone 7.8).
 *
 * Restores tables from a JSON export created by `npm run db:export`.
 * Refuses to run against a database that already has data unless
 * `--force` is passed.
 *
 * Usage:
 *   npm run db:import -- backups/db-export-2026-10-27T...json
 *   npm run db:import -- --force <file.json>
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

const DB_FILE = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
const force = process.argv.includes('--force');
const jsonArg = process.argv.find((a) => a.endsWith('.json'));

if (!jsonArg) {
  console.error('Usage: npm run db:import -- [--force] <export.json>');
  process.exit(1);
}

interface ExportPayload {
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

const payload: ExportPayload = JSON.parse(readFileSync(jsonArg, 'utf-8'));
const sqlite = new Database(DB_FILE);

// Safety guard: never silently overwrite existing research data.
const tables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all() as Array<{ name: string }>;
const hasData = tables.some((t) => {
  try {
    const row = sqlite.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get() as { c: number };
    return row.c > 0;
  } catch {
    return false;
  }
});
if (hasData && !force) {
  console.error('✗ Target database already contains data. Use --force to overwrite (current data will be lost).');
  sqlite.close();
  process.exit(1);
}

const insert = sqlite.Transaction(function importTable(tableName: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return 0;
  sqlite.prepare(`DELETE FROM "${tableName}"`).run();
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = sqlite.prepare(`INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`);
  for (const row of rows) stmt.run(...columns.map((c) => row[c]));
  return rows.length;
});

console.log(`Restoring from ${jsonArg} (exported ${payload.exportedAt})`);
for (const [table, rows] of Object.entries(payload.tables)) {
  if (!tables.some((t) => t.name === table)) {
    console.warn(`  ⚠ table "${table}" not present in target schema — skipped`);
    continue;
  }
  const count = insert(table, rows);
  console.log(`  ${table}: ${count} rows restored`);
}

sqlite.close();
console.log('✓ Import complete');
