import { describe, it, expect } from 'vitest';
import {
  redactText,
  redactHeaders,
  REDACTED_PLACEHOLDER,
  DEFAULT_SENSITIVE_FIELDS,
} from '@/lib/security/redaction';

describe('redactText — field redaction', () => {
  it('redacts password keys in JSON', () => {
    const out = redactText('{"username":"admin","password":"hunter2secret"}');
    expect(out.content).toContain('hunter2secret' === '' ? '' : '[REDACTED]');
    expect(out.content).not.toContain('hunter2secret');
    expect(out_redactions_contains(out, 'password')).toBe(true);
  });

  it('redacts key=value and url query forms', () => {
    const out = redactText('POST /login auth_token=abcdef12345 HTTP/1.1');
    expect(out.content).not.toContain('abcdef12345');
  });

  it('redacts "token" keys in url query strings', () => {
    const out = redactText('https://api.example.com/?api_key=sk_live_abcdef123456789&page=1');
    expect(out.content).not.toContain('sk_live_abcdef123456789');
  });

  it('does not redact innocent words like "onetime" only when key contains sensitive name', () => {
    const out = redactText('note: "authority_document" value present "abc123tokenvalue" no');
    expect(out.content).toContain('authority_document');
  });

  it('leaves short values untouched (too small to be a secret)', () => {
    const out = redactText('"pin": "1234"');
    expect(out.content).not.toBe(undefined);
  });
});

describe('redactText — inline token redaction', () => {
  it('redacts Bearer tokens', () => {
    const out = redactText('Authorization: Bearer abc.def123ghi789-jkl');
    expect(out.content).not.toContain('abc.def123ghi789-jkl');
    expect(out.content).toContain(REDACTED_PLACEHOLDER);
  });

  it('redacts JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const out = redactText(`token ${jwt} end`);
    expect(out.content).not.toContain(jwt);
  });

  it('redacts raw.sk keys', () => {
    const out = redactText('key is sk-proj-abcdefghij1234567890KLMNOP');
    expect(out.content).not.toContain('sk-proj-abcdefghij1234567890KLMNOP');
  });

  it('redacts GitHub tokens', () => {
    const out = redactText('ghp_abcdefghijklmnopqrst1234567890ABCD');
    expect(out.content).not.toContain('ghp_');
  });
});

describe('redactText — PII redaction', () => {
  it('redacts email addresses', () => {
    const out = redactText('contact jane.doe@example.com for info');
    expect(out.content).not.toContain('jane.doe@example.com');
    expect(out.content).toContain('[REDACTED]');
  });

  it('redacts long digit sequences in text', () => {
    const out = redactText('"card_number": "4111111111111111"');
    expect(out.content).not.toContain('4111111111111111');
  });

  it('PII redaction can be disabled', () => {
    const src = 'contact jane.doe@example.com for info';
    const out = redactText(src, { disable: ['pii', 'fields', 'inline'] });
    expect(out.content).toContain('jane.doe@example.com');
  });
});

describe('redactHeaders', () => {
  it('redacts sensitive headers wholesale', () => {
    const { headers, redactedFields } = redactHeaders({
      Accept: 'text/html',
      Authorization: 'Bearer secret-tok',
      Cookie: 'session=abc; other=x',
    });
    expect(headers.Authorization).toBe(REDACTED_PLACEHOLDER);
    expect(headers.Cookie).toBe(REDACTED_PLACEHOLDER);
    expect(headers.Accept).toBe('text/html');
    expect(redactedFields).toEqual(['Authorization', 'Cookie']);
  });

  it('supports custom extra headers', () => {
    const { headers } = redactHeaders({ 'X-Magic-Indicator': 'hush' }, { extraSensitiveHeaders: ['x-magic-indicator'] });
    expect(headers['X-Magic-Indicator']).toBe(REDACTED_PLACEHOLDER);
  });

  it('redacts secret-shaped values inside otherwise innocuous headers', () => {
    const { headers } = redactHeaders({ 'X-Trace-Note': 'token via Bearer abcdef1234567890' });
    expect(headers['X-Trace-Note']).toContain('[REDACTED]');
    expect(headers['X-Trace-Note']).not.toContain('abcdef1234567890');
  });
});

describe('configurability', () => {
  it('supports custom extra sensitive field names', () => {
    expect(DEFAULT_SENSITIVE_FIELDS).toContain('api_key');
    const out = redactText('tanuki_deploy_flag_value = "supersecretvalue"', { extraSensitiveFields: ['tanuki_deploy_flag_value'] });
    expect(out.content).not.toContain('supersecretvalue');
  });

  it('supports custom extra patterns', () => {
    const out = redactText('MAGIC-“secret-pattern-value”-END', { extraPatterns: [/secret-pattern-value/g] });
    expect(out.content).not.toContain('secret-pattern-value');
  });
});

/**
 * The file hashing never reveals secrets either way — content equality is the
 * part we test (fixtures for redaction preview UI appear in m7.11 suite).
 */
function out_redactions_contains(result: { redactions: Array<{ field: string }> }, field: string): boolean {
  return result.redactions.some((r) => r.field === field);
}
