import { describe, it, expect } from 'vitest';
import { featureCreateSchema, featureUpdateSchema, featureParamsSchema, featureListQuerySchema } from '@/lib/validation/features';
import { endpointCreateSchema, endpointUpdateSchema, endpointParamsSchema, endpointListQuerySchema, testStatusSchema } from '@/lib/validation/endpoints';
import { z } from 'zod';

describe('Feature Validation Schemas', () => {
  describe('featureCreateSchema', () => {
    const validFeature = {
      programId: '123e4567-e89b-12d3-a456-426614174000',
      assetId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'User Authentication',
      description: 'Handles user login and session management',
      rolesJson: ['admin', 'user'],
      resourceTypesJson: ['user', 'session'],
      expectedSecurityPropertiesJson: ['authentication', 'authorization', 'rate-limiting'],
      notes: 'Critical security feature',
    };

    it('accepts valid feature', () => {
      const result = featureCreateSchema.parse(validFeature);
      expect(result.name).toBe('User Authentication');
      expect(result.rolesJson).toEqual(['admin', 'user']);
    });

    it('defaults optional arrays to empty', () => {
      const { rolesJson, resourceTypesJson, expectedSecurityPropertiesJson, ...rest } = validFeature;
      const result = featureCreateSchema.parse(rest);
      expect(result.rolesJson).toEqual([]);
      expect(result.resourceTypesJson).toEqual([]);
      expect(result.expectedSecurityPropertiesJson).toEqual([]);
    });

    it('accepts null assetId', () => {
      const result = featureCreateSchema.parse({ ...validFeature, assetId: null });
      expect(result.assetId).toBeNull();
    });

    it('rejects missing programId', () => {
      const { programId, ...rest } = validFeature;
      expect(() => featureCreateSchema.parse(rest)).toThrow(z.ZodError);
    });

    it('rejects empty name', () => {
      expect(() => featureCreateSchema.parse({ ...validFeature, name: '' })).toThrow(z.ZodError);
    });

    it('rejects name > 200 chars', () => {
      expect(() => featureCreateSchema.parse({ ...validFeature, name: 'a'.repeat(201) })).toThrow(z.ZodError);
    });
  });

  describe('featureUpdateSchema', () => {
    it('allows partial updates', () => {
      const result = featureUpdateSchema.parse({ name: 'Updated Feature' });
      expect(result.name).toBe('Updated Feature');
    });
  });

  describe('featureParamsSchema', () => {
    it('accepts valid UUID', () => {
      const result = featureParamsSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('featureListQuerySchema', () => {
    it('defaults correctly', () => {
      const result = featureListQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
    });
  });
});

describe('Endpoint Validation Schemas', () => {
  describe('testStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(testStatusSchema.parse('untested')).toBe('untested');
      expect(testStatusSchema.parse('testing')).toBe('testing');
      expect(testStatusSchema.parse('tested_vulnerable')).toBe('tested_vulnerable');
      expect(testStatusSchema.parse('tested_secure')).toBe('tested_secure');
      expect(testStatusSchema.parse('blocked')).toBe('blocked');
    });

    it('rejects invalid status', () => {
      expect(() => testStatusSchema.parse('invalid')).toThrow(z.ZodError);
    });
  });

  describe('endpointCreateSchema', () => {
    const validEndpoint = {
      programId: '123e4567-e89b-12d3-a456-426614174000',
      assetId: '123e4567-e89b-12d3-a456-426614174001',
      featureId: '123e4567-e89b-12d3-a456-426614174002',
      method: 'GET',
      pathTemplate: '/api/v1/users/:id',
      purpose: 'Get user profile',
      authenticationRequirement: 'Bearer token',
      expectedAuthorization: 'User can only access own profile',
      sourceEvidenceId: '123e4567-e89b-12d3-a456-426614174003',
      testStatus: 'untested' as const,
      notes: 'Critical endpoint',
    };

    it('accepts valid endpoint', () => {
      const result = endpointCreateSchema.parse(validEndpoint);
      expect(result.method).toBe('GET');
      expect(result.pathTemplate).toBe('/api/v1/users/:id');
    });

    it('defaults testStatus to untested', () => {
      const { testStatus, ...rest } = validEndpoint;
      const result = endpointCreateSchema.parse(rest);
      expect(result.testStatus).toBe('untested');
    });

    it('accepts null assetId and featureId', () => {
      const result = endpointCreateSchema.parse({ ...validEndpoint, assetId: null, featureId: null });
      expect(result.assetId).toBeNull();
      expect(result.featureId).toBeNull();
    });

    it('rejects missing programId', () => {
      const { programId, ...rest } = validEndpoint;
      expect(() => endpointCreateSchema.parse(rest)).toThrow(z.ZodError);
    });

    it('rejects empty pathTemplate', () => {
      expect(() => endpointCreateSchema.parse({ ...validEndpoint, pathTemplate: '' })).toThrow(z.ZodError);
    });

    it('rejects empty method', () => {
      expect(() => endpointCreateSchema.parse({ ...validEndpoint, method: '' })).toThrow(z.ZodError);
    });

    it('rejects invalid testStatus', () => {
      expect(() => endpointCreateSchema.parse({ ...validEndpoint, testStatus: 'invalid' })).toThrow(z.ZodError);
    });
  });

  describe('endpointUpdateSchema', () => {
    it('allows partial updates', () => {
      const result = endpointUpdateSchema.parse({ testStatus: 'tested_secure' });
      expect(result.testStatus).toBe('tested_secure');
    });
  });

  describe('endpointParamsSchema', () => {
    it('accepts valid UUID', () => {
      const result = endpointParamsSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('endpointListQuerySchema', () => {
    it('defaults correctly', () => {
      const result = endpointListQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('method');
      expect(result.sortOrder).toBe('asc');
    });
  });
});