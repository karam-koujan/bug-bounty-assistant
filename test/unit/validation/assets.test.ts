import { describe, it, expect } from 'vitest';
import { assetCreateSchema, assetUpdateSchema, assetParamsSchema, scopeStatusSchema } from '@/lib/validation/assets';
import { z } from 'zod';

describe('Asset Validation Schemas', () => {
  describe('scopeStatusSchema', () => {
    it('accepts valid scope statuses', () => {
      expect(scopeStatusSchema.parse('in_scope')).toBe('in_scope');
      expect(scopeStatusSchema.parse('out_of_scope')).toBe('out_of_scope');
      expect(scopeStatusSchema.parse('unknown')).toBe('unknown');
    });

    it('rejects invalid scope status', () => {
      expect(() => scopeStatusSchema.parse('invalid')).toThrow(z.ZodError);
    });
  });

  describe('assetCreateSchema', () => {
    const validAsset = {
      programId: '123e4567-e89b-12d3-a456-426614174000',
      assetIdentifier: 'api.example.com',
      assetType: 'REST API',
      scopeStatus: 'in_scope' as const,
      restrictionsJson: { rateLimit: '100 req/min', authRequired: true },
      evidenceId: '123e4567-e89b-12d3-a456-426614174001',
      notes: 'Core API',
    };

    it('accepts valid asset', () => {
      const result = assetCreateSchema.parse(validAsset);
      expect(result.assetIdentifier).toBe('api.example.com');
      expect(result.scopeStatus).toBe('in_scope');
      expect(result.restrictionsJson).toEqual({ rateLimit: '100 req/min', authRequired: true });
    });

    it('defaults scopeStatus to unknown', () => {
      const { scopeStatus, ...rest } = validAsset;
      const result = assetCreateSchema.parse(rest);
      expect(result.scopeStatus).toBe('unknown');
    });

    it('defaults restrictionsJson to empty object', () => {
      const { restrictionsJson, ...rest } = validAsset;
      const result = assetCreateSchema.parse(rest);
      expect(result.restrictionsJson).toEqual({});
    });

    it('rejects missing programId', () => {
      const { programId, ...rest } = validAsset;
      expect(() => assetCreateSchema.parse(rest)).toThrow(z.ZodError);
    });

    it('rejects invalid programId format', () => {
      expect(() => assetCreateSchema.parse({ ...validAsset, programId: 'not-uuid' })).toThrow(z.ZodError);
    });

    it('rejects empty assetIdentifier', () => {
      expect(() => assetCreateSchema.parse({ ...validAsset, assetIdentifier: '' })).toThrow(z.ZodError);
    });

    it('rejects assetIdentifier > 500 chars', () => {
      expect(() => assetCreateSchema.parse({ ...validAsset, assetIdentifier: 'a'.repeat(501) })).toThrow(z.ZodError);
    });

    it('rejects empty assetType', () => {
      expect(() => assetCreateSchema.parse({ ...validAsset, assetType: '' })).toThrow(z.ZodError);
    });

    it('rejects assetType > 100 chars', () => {
      expect(() => assetCreateSchema.parse({ ...validAsset, assetType: 'a'.repeat(101) })).toThrow(z.ZodError);
    });

    it('accepts null evidenceId', () => {
      const result = assetCreateSchema.parse({ ...validAsset, evidenceId: null });
      expect(result.evidenceId).toBeNull();
    });

    it('rejects invalid evidenceId format', () => {
      expect(() => assetCreateSchema.parse({ ...validAsset, evidenceId: 'not-uuid' })).toThrow(z.ZodError);
    });
  });

  describe('assetUpdateSchema', () => {
    it('allows partial updates', () => {
      const result = assetUpdateSchema.parse({ scopeStatus: 'out_of_scope' });
      expect(result.scopeStatus).toBe('out_of_scope');
    });

    it('allows empty object', () => {
      const result = assetUpdateSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('assetParamsSchema', () => {
    it('accepts valid UUID', () => {
      const result = assetParamsSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid UUID', () => {
      expect(() => assetParamsSchema.parse({ id: 'not-uuid' })).toThrow(z.ZodError);
    });
  });
});