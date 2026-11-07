import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, createTestProgram, createTestAsset, createTestFeature } from '../utils/test-db';
import { features } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Features API Integration', () => {
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

  describe('GET /api/programs/[id]/features', () => {
    it('returns empty list for program with no features', async () => {
      const result = await testDb.db.select().from(features).where(eq(features.programId, programId));
      expect(result).toHaveLength(0);
    });

    it('returns features for program', async () => {
      createTestFeature(testDb.db, programId, { name: 'Auth', assetId: null });
      createTestFeature(testDb.db, programId, { name: 'Payments', assetId: null });

      const result = await testDb.db.select().from(features).where(eq(features.programId, programId));
      expect(result).toHaveLength(2);
      expect(result.map(f => f.name)).toContain('Auth');
      expect(result.map(f => f.name)).toContain('Payments');
    });

    it('filters by assetId', async () => {
      const asset = createTestAsset(testDb.db, programId, { assetIdentifier: 'api.example.com' });
      createTestFeature(testDb.db, programId, { name: 'Auth', assetId: asset.id });
      createTestFeature(testDb.db, programId, { name: 'Public', assetId: null });

      const withAsset = await testDb.db.select().from(features).where(eq(features.programId, programId)).where(eq(features.assetId, asset.id));
      expect(withAsset).toHaveLength(1);
      expect(withAsset[0].name).toBe('Auth');
    });

    it('searches by name', async () => {
      createTestFeature(testDb.db, programId, { name: 'User Authentication' });
      createTestFeature(testDb.db, programId, { name: 'Payment Processing' });

      const results = await testDb.db.select().from(features).where(eq(features.programId, programId));
      const filtered = results.filter(f => f.name.toLowerCase().includes('auth'));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('User Authentication');
    });

    it('stores JSON arrays as strings', async () => {
      const roles = ['admin', 'user', 'guest'];
      const feature = createTestFeature(testDb.db, programId, { 
        name: 'Auth', 
        rolesJson: JSON.stringify(roles),
        resourceTypesJson: JSON.stringify(['user']),
        expectedSecurityPropertiesJson: JSON.stringify(['auth']),
      });

      const result = await testDb.db.select().from(features).where(eq(features.id, feature.id));
      expect(JSON.parse(result[0].rolesJson)).toEqual(roles);
    });
  });

  describe('POST /api/programs/[id]/features', () => {
    it('creates feature with valid data', async () => {
      const newFeature = {
        id: 'new-feature-uuid',
        programId,
        assetId: null,
        name: 'New Feature',
        description: 'Description',
        rolesJson: JSON.stringify(['admin']),
        resourceTypesJson: JSON.stringify(['user']),
        expectedSecurityPropertiesJson: JSON.stringify(['auth']),
        notes: 'Notes',
      };

      await testDb.db.insert(features).values(newFeature);

      const result = await testDb.db.select().from(features).where(eq(features.programId, programId));
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('New Feature');
    });

    it('accepts all fields', async () => {
      const asset = createTestAsset(testDb.db, programId, { assetIdentifier: 'api.example.com' });
      
      await testDb.db.insert(features).values({
        id: 'feat-1',
        programId,
        assetId: asset.id,
        name: 'Complete Feature',
        description: 'Full feature',
        rolesJson: JSON.stringify(['admin', 'user']),
        resourceTypesJson: JSON.stringify(['user', 'organization']),
        expectedSecurityPropertiesJson: JSON.stringify(['auth', 'authz', 'encryption']),
        notes: 'Complete',
      });

      const result = await testDb.db.select().from(features).where(eq(features.programId, programId));
      expect(result).toHaveLength(1);
      expect(result[0].assetId).toBe(asset.id);
      expect(JSON.parse(result[0].rolesJson)).toEqual(['admin', 'user']);
    });
  });

  describe('PATCH /api/programs/[id]/features/[featureId]', () => {
    it('updates feature name', async () => {
      const feature = createTestFeature(testDb.db, programId, { name: 'Old Name' });

      await testDb.db.update(features).set({ name: 'New Name' }).where(eq(features.id, feature.id));

      const result = await testDb.db.select().from(features).where(eq(features.id, feature.id));
      expect(result[0].name).toBe('New Name');
    });

    it('updates JSON fields', async () => {
      const feature = createTestFeature(testDb.db, programId, { rolesJson: JSON.stringify(['user']) });

      await testDb.db.update(features).set({ rolesJson: JSON.stringify(['admin', 'user']) }).where(eq(features.id, feature.id));

      const result = await testDb.db.select().from(features).where(eq(features.id, feature.id));
      expect(JSON.parse(result[0].rolesJson)).toEqual(['admin', 'user']);
    });

    it('returns 0 changes for non-existent feature', async () => {
      const result = await testDb.db.update(features).set({ name: 'New' }).where(eq(features.id, 'non-existent'));
      expect(result.changes).toBe(0);
    });
  });

  describe('DELETE /api/programs/[id]/features/[featureId]', () => {
    it('deletes feature by id', async () => {
      const feature = createTestFeature(testDb.db, programId, { name: 'To Delete' });

      await testDb.db.delete(features).where(eq(features.id, feature.id));

      const result = await testDb.db.select().from(features).where(eq(features.programId, programId));
      expect(result).toHaveLength(0);
    });

    it('does not affect other features', async () => {
      const feat1 = createTestFeature(testDb.db, programId, { name: 'Keep' });
      const feat2 = createTestFeature(testDb.db, programId, { name: 'Delete' });

      await testDb.db.delete(features).where(eq(features.id, feat2.id));

      const result = await testDb.db.select().from(features).where(eq(features.programId, programId));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(feat1.id);
    });
  });
});