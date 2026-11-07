/**
 * Database export (Milestone 7.8).
 *
 * Exports every table in the research database to a JSON file (default
 * `./backups/db-export-<timestamp>.json`). With `--csv <table>` exports a
 * single table as CSV instead.
 *
 * Usage:
 *   npm run db:export                # full JSON backup
 *   npm run db:export -- --csv evidence   # single table CSV
 */
import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DB_FILE = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
const sqlite = new Database(DB_FILE, { readonly: true });

function getTables(): string[] {
  const rows = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_fts%' AND name NOT LIKE 'fts_%'"
  ).all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

function ts(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function exportJson(): void {
  const outDir = path.resolve('./backups');
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `db-export-${ts()}.json`);

  const data: Record<string, unknown[]> = {};
  for (const table of getTables()) {
    data[table] = sqlite.prepare(`SELECT * FROM "${table}"`).all();
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    databaseFile: DB_FILE,
    tableCount: Object.keys(data).length,
    rowCounts: Object.fromEntries(Object.entries(data).map(([t, rows]) => [t, rows.length])),
    tables: data,
  };
  writeFileSync(file, JSON.stringify(payload, null, 2));
  for (const [t, rows] of Object.entries(data)) {
    console.error(`  ${t}: ${rows.length} rows`);
  }
  console.log(`✓ Exported database to ${file}`);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportCsv(tableName: string): void {
  const tables = getTables();
  if (!tables.includes(tableName)) {
    console.error(`✗ Table "${tableName}" not found. Available: ${tables.join(', ')}`);
    process.exit(1);
  }
  const rows = sqlite.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, unknown>[];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : sqlite.prepare(`PRAGMA table_info("${tableName}")`).all().map((c: unknown) => (c as { name: string }).name);
  const lines = [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))];
  const outDir = path.resolve('./backups');
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${tableName}-export-${ts()}.csv`);
  writeFileSync(file, lines.join('\n'));
  console.log(`✓ Exported ${rows.length} rows of "${tableName}" to ${file}`);
}

const csvIndex = process.argv.indexOf('--csv');
if (csvIndex !== -1 && process.argv[csvIndex + 1]) {
  exportCsv(process.argv[csvIndex + 1]);
} else {
  exportJson();
}
sqlite.close();
