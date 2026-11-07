import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

const sqlite = globalForDb.db
  ? globalForDb.db.$client
  : new Database(process.env.DATABASE_URL?.replace('file:', '') || './dev.db');

if (!globalForDb.db) {
  globalForDb.db = drizzle(sqlite, { schema });
}

export const db = globalForDb.db;