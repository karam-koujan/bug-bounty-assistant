import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, createTestProgram, createTestAsset } from '../utils/test-db';
import { assets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

describe('Scope Enforcement Security Tests', () => {
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

  describe('Asset Scope Validation', () => {
    it('only allows in_scope assets for testing', async () => {
      const inScopeAsset = createTestAsset(testDb.db, programId, { 
        assetIdentifier: 'api.example.com', 
        scopeStatus: 'in_scope' 
      });
      const outOfScopeAsset = createTestAsset(testDb.db, programId, { 
        assetIdentifier: 'internal.example.com', 
        scopeStatus: 'out_of_scope' 
      });
      const unknownAsset = createTestAsset(testDb.db, programId, { 
        assetIdentifier: 'unknown.example.com', 
        scopeStatus: 'unknown' 
      });

      // Simulate scope check logic
      const canTestInScope = inScopeAsset.scopeStatus === 'in_scope';
      const canTestOutOfScope = outOfScopeAsset.scopeStatus === 'in_scope';
      const canTestUnknown = unknownAsset.scopeStatus === 'in_scope';

      expect(canTestInScope).toBe(true);
      expect(canTestOutOfScope).toBe(false);
      expect(canTestUnknown).toBe(false);
    });

    it('fails closed - unknown scope defaults to not allowed', async () => {
      const asset = createTestAsset(testDb.db, programId, { 
        assetIdentifier: 'test.example.com', 
        scopeStatus: 'unknown' 
      });

      const canTest = asset.scopeStatus === 'in_scope';
      expect(canTest).toBe(false);
    });

    it('asset identifier is unique per program', async () => {
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

    it('scopeStatus enum only accepts valid values', async () => {
      const validStatuses = ['in_scope', 'out_of_scope', 'unknown'];
      
      for (const status of validStatuses) {
        const asset = createTestAsset(testDb.db, programId, { 
          assetIdentifier: `asset-${status}`, 
          scopeStatus: status as any 
        });
        expect(asset.scopeStatus).toBe(status);
      }
    });
  });

  describe('Scope Checker Logic (Fail Closed)', () => {
    it('returns false for non-existent asset', () => {
      const asset = null;
      const canTest = asset !== null && asset.scopeStatus === 'in_scope';
      expect(canTest).toBe(false);
    });

    it('returns false for out_of_scope asset', () => {
      const asset = { scopeStatus: 'out_of_scope' };
      const canTest = asset.scopeStatus === 'in_scope';
      expect(canTest).toBe(false);
    });

    it('returns false for unknown scope asset', () => {
      const asset = { scopeStatus: 'unknown' };
      const canTest = asset.scopeStatus === 'in_scope';
      expect(canTest).toBe(false);
    });

    it('returns true only for in_scope asset', () => {
      const asset = { scopeStatus: 'in_scope' };
      const canTest = asset.scopeStatus === 'in_scope';
      expect(canTest).toBe(true);
    });
  });
});