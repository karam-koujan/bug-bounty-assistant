import { describe, it, expect } from 'vitest';
import { isCsrfViolation, handleApiError } from '@/lib/api/handler';
import { ZodError } from 'zod';

function req(method: string, headers: Record<string, string>): Request {
  return new Request('http://127.0.0.1:3000/api/programs', { method, headers });
}

describe('isCsrfViolation (M7.5)', () => {
  it('allows same-origin POST', () => {
    expect(isCsrfViolation(req('POST', { origin: 'http://127.0.0.1:3000', host: '127.0.0.1:3000' }))).toBe(false);
  });

  it('blocks cross-origin POST', () => {
    expect(isCsrfViolation(req('POST', { origin: 'http://evil.example', host: '127.0.0.1:3000' }))).toBe(true);
  });

  it('blocks malformed Origin header (fail closed)', () => {
    expect(isCsrfViolation(req('POST', { origin: '::not-a-url::', host: '127.0.0.1:3000' }))).toBe(true);
  });

  it('allows non-browser POST without Origin header', () => {
    expect(isCsrfViolation(req('POST', { host: '127.0.0.1:3000' }))).toBe(false);
  });

  it('allows cross-origin GET (safe method, no state change)', () => {
    expect(isCsrfViolation(req('GET', { origin: 'http://evil.example', host: '127.0.0.1:3000' }))).toBe(false);
  });

  it('blocks mutating methods with Origin but missing Host', () => {
    expect(isCsrfViolation(req('PATCH', { origin: 'http://anything' }))).toBe(true);
  });
});

describe('handleApiError (M7.1/M7.7)', () => {
  it('maps ZodError to 400 with details', async () => {
    const zerr = new ZodError([
      { code: 'invalid_type', expected: 'string', received: 'number', path: ['name'], message: 'Expected string, received number' } as never,
    ]);
    const res = handleApiError(zerr, 'test/route');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details: Array<{ path: string }> };
    expect(body.error).toBe('Validation failed');
    expect(body.details?.[0]?.path).toBe('name');
  });

  it('maps unexpected errors to generic 500', async () => {
    const res = handleApiError(new Error('Connection refused: odbc driver with secret abc123'), 'test/route');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Internal server error');
  });
});
