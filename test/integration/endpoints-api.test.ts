import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, createTestProgram, createTestAsset, createTestFeature } from '../utils/test-db';
import { endpoints } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Endpoints API Integration', () => {
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

  describe('GET /api/programs/[id]/endpoints', () => {
    it('returns empty list for program with no endpoints', async () => {
      const result = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId));
      expect(result).toHaveLength(0);
    });

    it('returns endpoints for program', async () => {
      await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/users',
        testStatus: 'untested', assetId: null, featureId: null,
        purpose: null, authenticationRequirement: null, expectedAuthorization: null,
        sourceEvidenceId: null, notes: null,
      });
      await testDb.db.insert(endpoints).values({
        id: 'ep-2', programId, method: 'POST', pathTemplate: '/api/login',
        testStatus: 'untested', assetId: null, featureId: null,
        purpose: null, authenticationRequirement: null, expectedAuthorization: null,
        sourceEvidenceId: null, notes: null,
      });

      const result = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId));
      expect(result).toHaveLength(2);
      expect(result.map(e => e.method)).toContain('GET');
      expect(result.map(e => e.method)).toContain('POST');
    });

    it('filters by assetId', async () => {
      const asset = createTestAsset(testDb.db, programId, { assetIdentifier: 'api.example.com' });
      await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/users', testStatus: 'untested',
        assetId: asset.id, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });
      await testDb.db.insert(endpoints).values({
        id: 'ep-2', programId, method: 'POST', pathTemplate: '/api/login', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });

      const withAsset = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId)).where(eq(endpoints.assetId, asset.id));
      expect(withAsset).toHaveLength(1);
      expect(withAsset[0].pathTemplate).toBe('/api/users');
    });

    it('filters by featureId', async () => {
      const feature = createTestFeature(testDb.db, programId, { name: 'Auth' });
      await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/users', testStatus: 'untested',
        assetId: null, featureId: feature.id, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });

      const withFeature = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId)).where(eq(endpoints.featureId, feature.id));
      expect(withFeature).toHaveLength(1);
    });

    it('filters by method', async () => {
      await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/users', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });
      await testDb.db.insert(endpoints).values({
        id: 'ep-2', programId, method: 'POST', pathTemplate: '/api/login', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });

      const getEndpoints = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId)).where(eq(endpoints.method, 'GET'));
      expect(getEndpoints).toHaveLength(1);
      expect(getEndpoints[0].method).toBe('GET');
    });

    it('filters by testStatus', async () => {
      await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/users', testStatus: 'tested_secure',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });
      await testDb.db.insert(endpoints).values({
        id: 'ep-2', programId, method: 'POST', pathTemplate: '/api/login', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });

      const tested = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId)).where(eq(endpoints.testStatus, 'tested_secure'));
      expect(tested).toHaveLength(1);
    });

    it('searches by pathTemplate', async () => {
      await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/users/:id', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });
      await testDb.db.insert(endpoints).values({
        id: 'ep-2', programId, method: 'POST', pathTemplate: '/api/login', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      });

      const results = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId));
      const filtered = results.filter(e => e.pathTemplate.includes('users'));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].pathTemplate).toBe('/api/users/:id');
    });
  });

  describe('POST /api/programs/[id]/endpoints', () => {
    it('creates endpoint with valid data', async () => {
      await testDb.db.insert(endpoints).values({
        id: 'new-ep', programId, method: 'GET', pathTemplate: '/api/test',
        testStatus: 'untested', assetId: null, featureId: null,
        purpose: 'Test', authenticationRequirement: 'Bearer', expectedAuthorization: 'Owner',
        sourceEvidenceId: null, notes: 'Note',
      });

      const result = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId));
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
      expect(result[0].pathTemplate).toBe('/api/test');
    });

    it('links to asset and feature', async () => {
      const asset = createTestAsset(testDb.db, programId, { assetIdentifier: 'api.example.com' });
      const feature = createTestFeature(testDb.db, programId, { name: 'Auth' });

      await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/users', testStatus: 'untested',
        assetId: asset.id, featureId: feature.id, purpose: 'Get user', authenticationRequirement: 'Bearer',
        expectedAuthorization: 'Owner', sourceEvidenceId: null, notes: null,
      });

      const result = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId));
      expect(result[0].assetId).toBe(asset.id);
      expect(result[0].featureId).toBe(feature.id);
    });
  });

  describe('PATCH /api/programs/[id]/endpoints/[endpointId]', () => {
    it('updates endpoint method and path', async () => {
      const ep = await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/old', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      }).returning({ id: endpoints.id });

      await testDb.db.update(endpoints).set({ method: 'POST', pathTemplate: '/api/new' }).where(eq(endpoints.id, ep[0].id));

      const result = await testDb.db.select().from(endpoints).where(eq(endpoints.id, ep[0].id));
      expect(result[0].method).toBe('POST');
      expect(result[0].pathTemplate).toBe('/api/new');
    });

    it('updates testStatus', async () => {
      const ep = await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/test', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      }).returning({ id: endpoints.id });

      await testDb.db.update(endpoints).set({ testStatus: 'tested_vulnerable' }).where(eq(endpoints.id, ep[0].id));

      const result = await testDb.db.select().from(endpoints).where(eq(endpoints.id, ep[0].id));
      expect(result[0].testStatus).toBe('tested_vulnerable');
    });

    it('returns 0 changes for non-existent endpoint', async () => {
      const result = await testDb.db.update(endpoints).set({ method: 'POST' }).where(eq(endpoints.id, 'non-existent'));
      expect(result.changes).toBe(0);
    });
  });

  describe('DELETE /api/programs/[id]/endpoints/[endpointId]', () => {
    it('deletes endpoint by id', async () => {
      const ep = await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/delete', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      }).returning({ id: endpoints.id });

      await testDb.db.delete(endpoints).where(eq(endpoints.id, ep[0].id));

      const result = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId));
      expect(result).toHaveLength(0);
    });

    it('does not affect other endpoints', async () => {
      const ep1 = await testDb.db.insert(endpoints).values({
        id: 'ep-1', programId, method: 'GET', pathTemplate: '/api/keep', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      }).returning({ id: endpoints.id });
      const ep2 = await testDb.db.insert(endpoints).values({
        id: 'ep-2', programId, method: 'POST', pathTemplate: '/api/delete', testStatus: 'untested',
        assetId: null, featureId: null, purpose: null, authenticationRequirement: null,
        expectedAuthorization: null, sourceEvidenceId: null, notes: null,
      }).returning({ id: endpoints.id });

      await testDb.db.delete(endpoints).where(eq(endpoints.id, ep2[0].id));

      const result = await testDb.db.select().from(endpoints).where(eq(endpoints.programId, programId));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(ep1[0].id);
    });
  });
});