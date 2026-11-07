import { describe, it, expect } from 'vitest';
import {
  sanitizeHeaders,
  sanitizeBody,
  sanitizeHttpRequest,
  generateContentHash,
  createEvidenceFromHttp,
} from '@/lib/http-sanitize';

describe('HTTP Sanitization', () => {
  describe('sanitizeHeaders', () => {
    it('redacts Authorization header', () => {
      const { sanitized, redacted } = sanitizeHeaders({ Authorization: 'Bearer token123', 'Content-Type': 'application/json' });
      expect(sanitized.Authorization).toBe('[REDACTED]');
      expect(sanitized['Content-Type']).toBe('application/json');
      expect(redacted).toContain('Authorization');
    });

    it('redacts Cookie header', () => {
      const { sanitized, redacted } = sanitizeHeaders({ Cookie: 'session=abc123', 'X-Custom': 'value' });
      expect(sanitized.Cookie).toBe('[REDACTED]');
      expect(redacted).toContain('Cookie');
    });

    it('redacts case-insensitive sensitive headers', () => {
      const { sanitized, redacted } = sanitizeHeaders({ 'x-api-key': 'secret', 'X-API-KEY': 'secret2' });
      expect(sanitized['x-api-key']).toBe('[REDACTED]');
      expect(sanitized['X-API-KEY']).toBe('[REDACTED]');
      expect(redacted.length).toBe(2);
    });

    it('preserves non-sensitive headers', () => {
      const { sanitized, redacted } = sanitizeHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' });
      expect(sanitized['Content-Type']).toBe('application/json');
      expect(sanitized.Accept).toBe('application/json');
      expect(redacted).toHaveLength(0);
    });

    it('handles empty headers', () => {
      const { sanitized, redacted } = sanitizeHeaders({});
      expect(sanitized).toEqual({});
      expect(redacted).toHaveLength(0);
    });
  });

  describe('sanitizeBody', () => {
    it('redacts password in JSON', () => {
      const body = JSON.stringify({ username: 'user', password: 'secret123', email: 'user@example.com' });
      const { sanitized, redacted } = sanitizeBody(body, 'application/json');
      const parsed = JSON.parse(sanitized);
      expect(parsed.password).toBe('[REDACTED]');
      expect(parsed.username).toBe('user');
      expect(redacted).toContain('password');
    });

    it('redacts nested sensitive fields', () => {
      const body = JSON.stringify({ user: { credentials: { api_key: 'key123' } } });
      const { sanitized, redacted } = sanitizeBody(body, 'application/json');
      const parsed = JSON.parse(sanitized);
      expect(parsed.user.credentials.api_key).toBe('[REDACTED]');
      expect(redacted).toContain('user.credentials.api_key');
    });

    it('redacts form-urlencoded sensitive fields', () => {
      const body = 'username=user&password=secret&client_secret=abc';
      const { sanitized, redacted } = sanitizeBody(body, 'application/x-www-form-urlencoded');
      expect(sanitized).toContain('password=%5BREDACTED%5D');
      expect(sanitized).toContain('client_secret=%5BREDACTED%5D');
      expect(redacted).toContain('password');
      expect(redacted).toContain('client_secret');
    });

    it('preserves non-sensitive fields', () => {
      const body = JSON.stringify({ username: 'user', email: 'user@example.com', preferences: { theme: 'dark' } });
      const { sanitized, redacted } = sanitizeBody(body, 'application/json');
      const parsed = JSON.parse(sanitized);
      expect(parsed.username).toBe('user');
      expect(parsed.email).toBe('user@example.com');
      expect(parsed.preferences.theme).toBe('dark');
      expect(redacted).toHaveLength(0);
    });

    it('handles invalid JSON gracefully', () => {
      const body = '{ invalid json }';
      const { sanitized, redacted } = sanitizeBody(body, 'application/json');
      expect(sanitized).toBe('{ invalid json }');
      expect(redacted).toHaveLength(0);
    });
  });

  describe('sanitizeHttpRequest', () => {
    it('sanitizes full request', () => {
      const result = sanitizeHttpRequest(
        'POST',
        '/api/login',
        { Authorization: 'Bearer token', 'Content-Type': 'application/json', Cookie: 'session=abc' },
        JSON.stringify({ username: 'user', password: 'secret' }),
        'application/json'
      );
      expect(result.headers.Authorization).toBe('[REDACTED]');
      expect(result.headers.Cookie).toBe('[REDACTED]');
      expect(result.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(result.body);
      expect(body.password).toBe('[REDACTED]');
      expect(body.username).toBe('user');
    });
  });

  describe('generateContentHash', () => {
    it('generates consistent hash', () => {
      const hash1 = generateContentHash('test content');
      const hash2 = generateContentHash('test content');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('generates different hash for different content', () => {
      const hash1 = generateContentHash('content 1');
      const hash2 = generateContentHash('content 2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createEvidenceFromHttp', () => {
    it('creates evidence from request', () => {
      const evidence = createEvidenceFromHttp(
        'prog-123',
        'request',
        'POST',
        '/api/login',
        { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        JSON.stringify({ username: 'user', password: 'secret' }),
        'application/json'
      );
      expect(evidence.evidenceType).toBe('http_request');
      expect(evidence.title).toBe('POST /api/login');
      expect(evidence.content).toContain('[REDACTED]');
      expect(evidence.contentHash).toBeDefined();
      const metadata = JSON.parse(evidence.metadataJson);
      expect(metadata.redactedFields.length).toBeGreaterThan(0);
      expect(metadata.direction).toBe('request');
    });

    it('creates evidence from response', () => {
      const evidence = createEvidenceFromHttp(
        'prog-123',
        'response',
        'GET',
        '/api/users/1',
        { 'Content-Type': 'application/json' },
        JSON.stringify({ id: 1, name: 'User', api_key: 'secret' }),
        'application/json'
      );
      expect(evidence.evidenceType).toBe('http_response');
      const metadata = JSON.parse(evidence.metadataJson);
      expect(metadata.direction).toBe('response');
    });
  });
});