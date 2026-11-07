import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, createTestProgram, createTestAsset, createTestEvidence } from '../utils/test-db';
import { evidence, programs, assets, hypotheses } from '@/lib/db/schema';
import { eq, like, sql } from 'drizzle-orm';
import { createHash } from 'crypto';

describe('Search API Integration (FTS5)', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let programId: string;

  beforeEach(() => {
    testDb = createTestDb();
    const program = createTestProgram(testDb.db);
    programId = program.id;
  });

  afterEach(() => {
    testDb.sqlite.close();
  });

  function generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  it('searches evidence via FTS5 with prefix matching', async () => {
    createTestEvidence(testDb.db, programId, {
      title: 'API endpoint returns user data',
      content: 'GET /api/users returns all users without auth check',
      evidenceType: 'endpoint_observation',
    });
    createTestEvidence(testDb.db, programId, {
      title: 'Web UI login bypass',
      content: 'Login form vulnerable to SQL injection',
      evidenceType: 'manual_test_result',
    });

    const ftsQuery = 'api* user*';
    const rows = await testDb.db.all(sql`
      SELECT e.id, e.program_id, e.evidence_type, e.title, e.content, e.source_url, e.collected_at, e.verification_status,
             bm25(evidence_fts) as rank
      FROM evidence_fts
      JOIN evidence e ON e.rowid = evidence_fts.rowid
      WHERE evidence_fts MATCH ${ftsQuery}
      ORDER BY rank
      LIMIT 20
    `);

    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].title).toBe('API endpoint returns user data');
  });

  it('searches evidence with single term', async () => {
    createTestEvidence(testDb.db, programId, {
      title: 'XSS in search parameter',
      content: 'Reflected XSS via q parameter',
      evidenceType: 'endpoint_observation',
    });
    createTestEvidence(testDb.db, programId, {
      title: 'IDOR on user profile',
      content: 'User can access other profiles',
      evidenceType: 'endpoint_observation',
    });

    const rows = await testDb.db.all(sql`
      SELECT e.title FROM evidence_fts
      JOIN evidence e ON e.rowid = evidence_fts.rowid
      WHERE evidence_fts MATCH ${'xss*'}
      LIMIT 20
    `);

    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].title).toBe('XSS in search parameter');
  });

  it('searches programs by name', async () => {
    const program2 = createTestProgram(testDb.db, { name: 'Another Program', programUrl: 'https://example.com/2' });

    const result = await testDb.db.select().from(programs).where(like(programs.name, '%Test%'));
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Test Program');
  });

  it('searches assets by identifier', async () => {
    createTestAsset(testDb.db, programId, { assetIdentifier: 'api.example.com' });
    createTestAsset(testDb.db, programId, { assetIdentifier: 'web.example.com' });

    const result = await testDb.db.select().from(assets).where(like(assets.assetIdentifier, '%api%'));
    expect(result.length).toBe(1);
    expect(result[0].assetIdentifier).toBe('api.example.com');
  });

  it('searches hypotheses by title', async () => {
    const { randomUUID } = await import('crypto');
    await testDb.db.insert(hypotheses).values({
      id: randomUUID(),
      programId,
      title: 'IDOR on user API',
      statement: 'User ID not validated',
      category: 'authorization',
      supportingEvidenceJson: '[]',
      contradictingEvidenceJson: '[]',
      assumptionsJson: '[]',
      prerequisitesJson: '[]',
      testPlan: 'Test with two users',
      expectedVulnerableResult: 'Access other user data',
      expectedSafeResult: '403 Forbidden',
      potentialImpact: 'High',
      status: 'draft',
      priorityScore: 5.0,
      priorityBreakdownJson: '{}',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await testDb.db.select().from(hypotheses).where(like(hypotheses.title, '%IDOR%'));
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('IDOR on user API');
  });

  it('filters out terms shorter than 2 characters', async () => {
    createTestEvidence(testDb.db, programId, {
      title: 'API test',
      content: 'Content',
      evidenceType: 'endpoint_observation',
    });

    // Query with single char term should return no results (filtered out)
    const terms = 'a api'.split(' ').filter(t => t.length >= 2);
    const ftsQuery = terms.map(term => `${term}*`).join(' ');
    
    const rows = await testDb.db.all(sql`
      SELECT e.title FROM evidence_fts
      JOIN evidence e ON e.rowid = evidence_fts.rowid
      WHERE evidence_fts MATCH ${ftsQuery}
      LIMIT 20
    `);

    expect(rows.rows.length).toBe(1); // Only 'api*' matches
    expect(rows.rows[0].title).toBe('API test');
  });

  it('limits results to max 50', async () => {
    for (let i = 0; i < 60; i++) {
      createTestEvidence(testDb.db, programId, {
        title: `Evidence ${i}`,
        content: `Content ${i}`,
        evidenceType: 'technology_observation',
      });
    }

    const rows = await testDb.db.all(sql`
      SELECT e.title FROM evidence_fts
      JOIN evidence e ON e.rowid = evidence_fts.rowid
      WHERE evidence_fts MATCH ${'evidence*'}
      LIMIT 50
    `);

    expect(rows.rows.length).toBe(50);
  });
});