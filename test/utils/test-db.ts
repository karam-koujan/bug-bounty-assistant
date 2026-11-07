import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';

import { randomUUID } from 'crypto';
import * as schema from '@/lib/db/schema';
import { programs, assets, evidence, features, endpoints, hypotheses, researchSessions, testObservations, reports, aiRuns } from '@/lib/db/schema';

const migrationDir = join(__dirname, '../../drizzle');

type AnyRecord = Record<string, unknown>;
const DATE_KEYS = ['createdAt', 'updatedAt', 'collectedAt', 'startedAt', 'endedAt', 'policyReviewedAt'];

/** Coerce numeric/string timestamps to Date so drizzle timestamp columns map correctly. */
function normalizeDates<T extends AnyRecord>(o: T): T {
  const out: AnyRecord = { ...o };
  for (const key of DATE_KEYS) {
    const value = out[key];
    if (value !== null && value !== undefined && !(value instanceof Date)) {
      out[key] = new Date(value as never);
    }
  }
  return out as T;
}

export function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });

  // Apply the real drizzle migrations (single source of truth) instead of a
  // hand-maintained DDL copy — prevents drift like missing created_at columns.
  for (const file of readdirSync(migrationDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => e.name)
    .sort()) {
    const sql = readFileSync(join(migrationDir, file), 'utf-8');
    sqlite.exec(sql);
  }

  return { db, sqlite };
}

export function createTestProgram(db: ReturnType<typeof drizzle>, overrides = {}) {
  const id = randomUUID();
  const program = normalizeDates({
    id,
    name: 'Test Program',
    platform: 'HackerOne',
    programUrl: 'https://hackerone.com/test',
    policyText: null,
    policyReviewedAt: null,
    researchStatus: 'inbox',
    evaluationScoresJson: '{}',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  db.insert(programs).values(program).run();
  return program;
}

export function createTestAsset(db: ReturnType<typeof drizzle>, programId: string, overrides = {}) {
  const id = randomUUID();
  const asset = {
    id,
    programId,
    assetIdentifier: 'api.example.com',
    assetType: 'REST API',
    scopeStatus: 'in_scope',
    restrictionsJson: JSON.stringify({ rateLimit: '100 req/min' }),
    evidenceId: null,
    notes: 'Test asset',
    ...overrides,
  };
  db.insert(assets).values(asset).run();
  return asset;
}

export function createTestEvidence(db: ReturnType<typeof drizzle>, programId: string, overrides = {}) {
  const id = randomUUID();
  const raw = {
    id,
    programId,
    evidenceType: 'endpoint_observation',
    title: 'Test Evidence',
    content: 'Test content',
    sourceUrl: null,
    collectedAt: new Date(),
    verificationStatus: 'unverified',
    contentHash: 'abc123',
    metadataJson: '{}',
    ...overrides,
  };
  const evidenceRecord = {
    ...raw,
    // Coerce number/string timestamps (tests pass Date.now(), '1000', …)
    collectedAt: raw.collectedAt instanceof Date ? raw.collectedAt : new Date(raw.collectedAt as never),
  };
  db.insert(evidence).values(evidenceRecord).run();
  return evidenceRecord;
}

export function createTestFeature(db: ReturnType<typeof drizzle>, programId: string, overrides = {}) {
  const id = randomUUID();
  const feature = {
    id,
    programId,
    assetId: overrides.assetId ?? null,
    name: overrides.name || 'Test Feature',
    description: overrides.description || null,
    rolesJson: overrides.rolesJson || JSON.stringify([]),
    resourceTypesJson: overrides.resourceTypesJson || JSON.stringify([]),
    expectedSecurityPropertiesJson: overrides.expectedSecurityPropertiesJson || JSON.stringify([]),
    notes: overrides.notes || null,
  };
  db.insert(features).values(feature).run();
  return feature;
}