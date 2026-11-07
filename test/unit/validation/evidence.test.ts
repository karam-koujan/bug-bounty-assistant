import { describe, it, expect } from 'vitest';
import {
  evidenceCreateSchema,
  evidenceUpdateSchema,
  evidenceParamsSchema,
  evidenceListQuerySchema,
  evidenceTypeSchema,
  verificationStatusSchema,
} from '@/lib/validation/evidence';
import { z } from 'zod';

describe('Evidence Validation Schemas', () => {
  describe('evidenceTypeSchema', () => {
    const validTypes = [
      'program_policy',
      'official_documentation',
      'security_advisory',
      'release_note',
      'technology_observation',
      'endpoint_observation',
      'http_request',
      'http_response',
      'manual_test_result',
      'screenshot_or_attachment',
      'researcher_conclusion',
    ];

    it('accepts all valid evidence types', () => {
      validTypes.forEach(type => {
        expect(evidenceTypeSchema.parse(type)).toBe(type);
      });
    });

    it('rejects invalid evidence type', () => {
      expect(() => evidenceTypeSchema.parse('invalid_type')).toThrow(z.ZodError);
    });
  });

  describe('verificationStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(verificationStatusSchema.parse('unverified')).toBe('unverified');
      expect(verificationStatusSchema.parse('verified')).toBe('verified');
      expect(verificationStatusSchema.parse('disputed')).toBe('disputed');
    });

    it('rejects invalid status', () => {
      expect(() => verificationStatusSchema.parse('invalid')).toThrow(z.ZodError);
    });
  });

  describe('evidenceCreateSchema', () => {
    const validEvidence = {
      programId: '123e4567-e89b-12d3-a456-426614174000',
      evidenceType: 'endpoint_observation' as const,
      title: 'GET /api/users returns all users',
      content: 'Endpoint returns all users without authorization check.',
      sourceUrl: 'https://api.example.com/docs',
      collectedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'unverified' as const,
      metadataJson: { endpoint: 'GET /api/users', severity: 'high' },
    };

    it('accepts valid evidence', () => {
      const result = evidenceCreateSchema.parse(validEvidence);
      expect(result.title).toBe('GET /api/users returns all users');
      expect(result.evidenceType).toBe('endpoint_observation');
      expect(result.verificationStatus).toBe('unverified');
    });

    it('defaults verificationStatus to unverified', () => {
      const { verificationStatus, ...rest } = validEvidence;
      const result = evidenceCreateSchema.parse(rest);
      expect(result.verificationStatus).toBe('unverified');
    });

    it('defaults metadataJson to empty object', () => {
      const { metadataJson, ...rest } = validEvidence;
      const result = evidenceCreateSchema.parse(rest);
      expect(result.metadataJson).toEqual({});
    });

    it('accepts null sourceUrl', () => {
      const result = evidenceCreateSchema.parse({ ...validEvidence, sourceUrl: null });
      expect(result.sourceUrl).toBeNull();
    });

    it('rejects missing programId', () => {
      const { programId, ...rest } = validEvidence;
      expect(() => evidenceCreateSchema.parse(rest)).toThrow(z.ZodError);
    });

    it('rejects invalid programId format', () => {
      expect(() => evidenceCreateSchema.parse({ ...validEvidence, programId: 'not-uuid' })).toThrow(z.ZodError);
    });

    it('rejects empty title', () => {
      expect(() => evidenceCreateSchema.parse({ ...validEvidence, title: '' })).toThrow(z.ZodError);
    });

    it('rejects title > 500 chars', () => {
      expect(() => evidenceCreateSchema.parse({ ...validEvidence, title: 'a'.repeat(501) })).toThrow(z.ZodError);
    });

    it('rejects empty content', () => {
      expect(() => evidenceCreateSchema.parse({ ...validEvidence, content: '' })).toThrow(z.ZodError);
    });

    it('rejects invalid sourceUrl format', () => {
      expect(() => evidenceCreateSchema.parse({ ...validEvidence, sourceUrl: 'not-a-url' })).toThrow(z.ZodError);
    });

    it('rejects invalid datetime format', () => {
      expect(() => evidenceCreateSchema.parse({ ...validEvidence, collectedAt: 'not-a-date' })).toThrow(z.ZodError);
    });
  });

  describe('evidenceUpdateSchema', () => {
    it('allows partial updates', () => {
      const result = evidenceUpdateSchema.parse({ verificationStatus: 'verified' });
      expect(result.verificationStatus).toBe('verified');
    });
  });

  describe('evidenceParamsSchema', () => {
    it('accepts valid UUID', () => {
      const result = evidenceParamsSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid UUID', () => {
      expect(() => evidenceParamsSchema.parse({ id: 'not-uuid' })).toThrow(z.ZodError);
    });
  });

  describe('evidenceListQuerySchema', () => {
    it('accepts valid query params', () => {
      const result = evidenceListQuerySchema.parse({
        page: '2',
        limit: '50',
        type: 'endpoint_observation',
        verificationStatus: 'verified',
        search: 'api',
        sortBy: 'collectedAt',
        sortOrder: 'desc',
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.type).toBe('endpoint_observation');
    });

    it('defaults page to 1', () => {
      const result = evidenceListQuerySchema.parse({});
      expect(result.page).toBe(1);
    });

    it('defaults limit to 20', () => {
      const result = evidenceListQuerySchema.parse({});
      expect(result.limit).toBe(20);
    });

    it('caps limit at 100', () => {
      const result = evidenceListQuerySchema.parse({ limit: '200' });
      expect(result.limit).toBe(100);
    });

    it('defaults sortBy to collectedAt', () => {
      const result = evidenceListQuerySchema.parse({});
      expect(result.sortBy).toBe('collectedAt');
    });

    it('defaults sortOrder to desc', () => {
      const result = evidenceListQuerySchema.parse({});
      expect(result.sortOrder).toBe('desc');
    });

    it('rejects invalid sortBy', () => {
      expect(() => evidenceListQuerySchema.parse({ sortBy: 'invalid' })).toThrow(z.ZodError);
    });

    it('rejects invalid sortOrder', () => {
      expect(() => evidenceListQuerySchema.parse({ sortOrder: 'invalid' })).toThrow(z.ZodError);
    });
  });
});