import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger } from '@/lib/logger';
import { redactText } from '@/lib/security/redaction';

describe('structured logger (M7.7 secret non-disclosure)', () => {
  const lines: string[] = [];
  const errSpy = vi.spyOn(console, 'error').mockImplementation((line: unknown) => lines.push(String(line)));
  const logSpy = vi.spyOn(console, 'log').mockImplementation((line: unknown) => lines.push(String(line)));

  afterEach(() => {
    lines.length = 0;
    errSpy.mockClear();
    logSpy.mockClear();
  });

  it('logs structured JSON lines at error level', () => {
    logger.error('Something failed', { route: 'test' });
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]) as { level: string; message: string; route: string };
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('Something failed');
    expect(parsed.route).toBe('test');
  });

  it('redacts secret-shaped substrings from messages', () => {
    logger.error('Authorization: Bearer supersecret-token-12345 failed');
    expect(lines.join('\n')).not.toContain('supersecret-token-12345');
    expect(lines.join('\n')).toContain('[REDACTED]');
  });

  it('redacts password-style keys from metadata values', () => {
    logger.error('reporting failure', { attempted: 'password=superLongSecretValue' });
    expect(lines.join('\n')).not.toContain('superLongSecretValue');
  });

  it('serializes errors without exposing their content unscrubbed', () => {
    logger.error('request failed', { error: new Error('api_key=sk-proj-abcdefabcdefabcdef12()') });
    expect(lines.join('\n')).not.toContain('sk-proj-abcdefabcdefabcdef12()');
  });

  it('suppresses debug and info output when calling error only', () => {
    logger.debug('noisy detail with password: hunterxyzlongvalue');
    expect(lines).toHaveLength(0);
  });
});

describe('redaction + logger integration', () => {
  it('redaction library is the shared scrubber for HTTP evidence text', () => {
    const raw = 'Cookie: SESSIONID=abc123def456ghi';
    expect(redactText(raw).content).toContain('REDACTED');
    expect(redactText(raw).content).not.toContain('abc123def456ghi');
  });
});
