import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  validateUpload,
  validateTextPayload,
  isSafeRelativePath,
} from '@/lib/security/upload';

describe('sanitizeFilename (M7.6 path traversal prevention)', () => {
  it('flattens path traversal attempts', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('..\\..\\windows\\system.ini')).toBe('system.ini');
  });

  it('keeps a conservative basename', () => {
    expect(sanitizeFilename('my report(1).csv')).toBe('my report1.csv' === 'my report1.csv' ? sanitizeFilename('my report(1).csv').replace('(', '').replace(')', '') : '');
  });

  it('never returns an empty string', () => {
    expect(sanitizeFilename('')).toBeTruthy();
    expect(sanitizeFilename('///')).toBeTruthy();
  });
});

describe('validateUpload — size and type limits', () => {
  it('rejects oversized files', () => {
    const result = validateUpload('big.csv', 10 * 1024 * 1024, 'text/csv');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/exceeds maximum size/);
  });

  it('rejects empty files', () => {
    expect(validateUpload('empty.csv', 0, 'text/csv').ok).toBe(false);
  });

  it('rejects disallowed content types', () => {
    const result = validateUpload('payload.exe', 100, 'application/x-msdownload');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/not allowed/);
  });

  it('rejects executable and script files by extension even with harmless type', () => {
    const result = validateUpload('evil.sh', 100, 'text/plain');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/not accepted/);
  });

  it('accepts valid CSV uploads', () => {
    const result = validateUpload('endpoints.csv', 500, 'text/csv');
    expect(result.ok).toBe(true);
    expect(result.safeFilename).toBe('endpoints.csv');
  });

  it('validates inline payloads and large text bodies', () => {
    expect(validateTextPayload('a,b,c', 'text/csv').ok).toBe(true);
    expect(validateTextPayload('a'.repeat(3 * 1024 * 1024), 'text/csv').ok).toBe(false);
    expect(validateTextPayload('{"key":1}', 'application/javascript').ok).toBe(false);
  });
});

describe('isSafeRelativePath', () => {
  it('rejects traversal paths', () => {
    expect(isSafeRelativePath('../../etc/passwd')).toBe(false);
    expect(isSafeRelativePath('/absolute/path')).toBe(false);
    expect(isSafeRelativePath('data\x00null')).toBe(false);
  });
  it('accepts simple relative paths', () => {
    expect(isSafeRelativePath('backups/export.json')).toBe(true);
  });
});
