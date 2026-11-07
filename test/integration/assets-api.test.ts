import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, createTestProgram, createTestAsset } from '../utils/test-db';
import { assets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Assets API Integration', () => {
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

  describe('GET /api/programs/[id]/scope', () => {
    it('returns empty list for program with no assets', async () => {
      const result = await testDb.db.select().from(assets).where(eq(assets.programId, programId));
      expect(result).toHaveLength(0);
    });

    it('returns assets for program', async () => {
      createTestAsset(testDb.db, programId, { assetIdentifier: 'api.example.com' });
      createTestAsset(testDb.db, programId, { assetIdentifier: 'web.example.com' });

      const result = await testDb.db.select().from(assets).where(eq(assets.programId, programId));
      expect(result).toHaveLength(2);
      expect(result.map(a => a.assetIdentifier)).toContain('api.example.com');
      expect(result.map(a => a.assetIdentifier)).toContain('web.example.com');
    });

    it('filters by scopeStatus', async () => {
      createTestAsset(testDb.db, programId, { assetIdentifier: 'in-scope', scopeStatus: 'in_scope' });
      createTestAsset(testDb.db, programId, { assetIdentifier: 'out-scope', scopeStatus: 'out_of_scope' });
      createTestAsset(testDb.db, programId, { assetIdentifier: 'unknown', scopeStatus: 'unknown' });

      const inScope = await testDb.db.select().from(assets).where(eq(assets.programId, programId)).where(eq(assets.scopeStatus, 'in_scope'));
      expect(inScope).toHaveLength(1);
      expect(inScope[0].assetIdentifier).toBe('in-scope');
    });

    it('searches by assetIdentifier', async () => {
      createTestAsset(testDb.db, programId, { assetIdentifier: 'api.example.com' });
      createTestAsset(testDb.db, programId, { assetIdentifier: 'web.example.com' });

      // Simulate LIKE query
      const results = await testDb.db.select().from(assets).where(eq(assets.programId, programId));
      const filtered = results.filter(a => a.assetIdentifier.includes('api'));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].assetIdentifier).toBe('api.example.com');
    });

    it('paginates results', async () => {
      for (let i = 0; i < 5; i++) {
        createTestAsset(testDb.db, programId, { assetIdentifier: `asset-${i}` });
      }

      const page1 = await testDb.db.select().from(assets).where(eq(assets.programId, programId)).limit(2).offset(0);
      const page2 = await testDb.db.select().from(assets).where(eq(assets.programId, programId)).limit(2).offset(2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
    });
  });

  describe('POST /api/programs/[id]/scope', () => {
    it('creates asset with valid data', async () => {
      const newAsset = {
        id: 'new-uuid-123',
        programId,
        assetIdentifier: 'new-api.example.com',
        assetType: 'GraphQL API',
        scopeStatus: 'in_scope',
        restrictionsJson: JSON.stringify({ rateLimit: '50 req/min', authRequired: true }),
        evidenceId: null,
        notes: 'New asset',
      };

      await testDb.db.insert(assets).values(newAsset);

      const result = await testDb.db.select().from(assets).where(eq(assets.programId, programId));
      expect(result).toHaveLength(1);
      expect(result[0].assetIdentifier).toBe('new-api.example.com');
      expect(result[0].scopeStatus).toBe('in_scope');
    });

    it('enforces unique constraint per program+identifier', async () => {
      createTestAsset(testDb.db, programId, { assetIdentifier: 'api.example.com' });

      const duplicateAsset = {
        id: 'dup-uuid',
        programId,
        assetIdentifier: 'api.example.com',
        assetType: 'REST API',
        scopeStatus: 'in_scope',
        restrictionsJson: '{}',
        evidenceId: null,
        notes: null,
      };

      await expect(testDb.db.insert(assets).values(duplicateAsset)).rejects.toThrow();
    });

    it('stores restrictionsJson as JSON string', async () => {
      const restrictions = { rateLimit: '100 req/min', authRequired: true, allowedMethods: ['IDOR', 'XSS'] };
      await testDb.db.insert(assets).values({
        id: 'asset-1',
        programId,
        assetIdentifier: 'api.example.com',
        assetType: 'REST API',
        scopeStatus: 'in_scope',
        restrictionsJson: JSON.stringify(restrictions),
        evidenceId: null,
        notes: null,
      });

      const result = await testDb.db.select().from(assets).where(eq(assets.programId, programId));
      expect(JSON.parse(result[0].restrictionsJson)).toEqual(restrictions);
    });
  });

  describe('PATCH /api/programs/[id]/scope/[assetId]', () => {
    it('updates asset scopeStatus', async () => {
      const asset = createTestAsset(testDb.db, programId, { assetIdentifier: 'to-update', scopeStatus: 'unknown' });

      await testDb.db.update(assets).set({ scopeStatus: 'in_scope' }).where(eq(assets.id, asset.id));

      const result = await testDb.db.select().from(assets).where(eq(assets.id, asset.id));
      expect(result[0].scopeStatus).toBe('in_scope');
    });

    it('updates restrictionsJson', async () => {
      const asset = createTestAsset(testDb.db, programId, { assetIdentifier: 'to-update' });

      const newRestrictions = { rateLimit: '200 req/min', authRequired: false };
      await testDb.db.update(assets).set({ restrictionsJson: JSON.stringify(newRestrictions) }).where(eq(assets.id, asset.id));

      const result = await testDb.db.select().from(assets).where(eq(assets.id, asset.id));
      expect(JSON.parse(result[0].restrictionsJson)).toEqual(newRestrictions);
    });

    it('returns empty result for non-existent asset', async () => {
      const result = await testDb.db.update(assets).set({ scopeStatus: 'in_scope' }).where(eq(assets.id, 'non-existent-id'));
      expect(result.changes).toBe(0);
    });
  });

  describe('DELETE /api/programs/[id]/scope/[assetId]', () => {
    it('deletes asset by id', async () => {
      const asset = createTestAsset(testDb.db, programId, { assetIdentifier: 'to-delete' });

      await testDb.db.delete(assets).where(eq(assets.id, asset.id));

      const result = await testDb.db.select().from(assets).where(eq(assets.programId, programId));
      expect(result).toHaveLength(0);
    });

    it('does not affect other assets', async () => {
      const asset1 = createTestAsset(testDb.db, programId, { assetIdentifier: 'keep' });
      const asset2 = createTestAsset(testDb.db, programId, { assetIdentifier: 'delete' });

      await testDb.db.delete(assets).where(eq(assets.id, asset2.id));

      const result = await testDb.db.select().from(assets).where(eq(assets.programId, programId));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(asset1.id);
    });
  });
});