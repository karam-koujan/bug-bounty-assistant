import { createHash } from 'crypto';

export interface SanitizedHttpData {
  headers: Record<string, string>;
  body: string;
  redactedFields: string[];
}

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-request-id',
  'x-session-id',
  'proxy-authorization',
  'www-authenticate',
];

const SENSITIVE_BODY_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'id_token',
  'client_secret',
  'client_id',
  'private_key',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cvv',
  'pin',
];

export function sanitizeHeaders(headers: Record<string, string>): { sanitized: Record<string, string>; redacted: string[] } {
  const sanitized: Record<string, string> = {};
  const redacted: string[] = [];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.some(s => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
      redacted.push(key);
    } else {
      sanitized[key] = value;
    }
  }

  return { sanitized, redacted };
}

export function sanitizeBody(body: string, contentType: string): { sanitized: string; redacted: string[] } {
  const redacted: string[] = [];

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(body);
      const sanitized = sanitizeJsonObject(parsed, redacted);
      return { sanitized: JSON.stringify(sanitized, null, 2), redacted };
    } catch {
      return { sanitized: body, redacted };
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(body);
    for (const [key] of params) {
      if (SENSITIVE_BODY_FIELDS.some(s => key.toLowerCase().includes(s))) {
        params.set(key, '[REDACTED]');
        redacted.push(key);
      }
    }
    return { sanitized: params.toString(), redacted };
  }

  return { sanitized: body, redacted };
}

function sanitizeJsonObject(obj: unknown, redacted: string[], path = ''): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeJsonObject(item, redacted, path));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_BODY_FIELDS.some(s => key.toLowerCase().includes(s))) {
      result[key] = '[REDACTED]';
      redacted.push(currentPath);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeJsonObject(value, redacted, currentPath);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function sanitizeHttpRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
  contentType = 'application/json'
): SanitizedHttpData {
  const { sanitized: sanitizedHeaders, redacted: redactedHeaders } = sanitizeHeaders(headers);
  const { sanitized: sanitizedBody, redacted: redactedBody } = sanitizeBody(body, contentType);

  return {
    headers: sanitizedHeaders,
    body: sanitizedBody,
    redactedFields: [...redactedHeaders, ...redactedBody],
  };
}

export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export type HttpDirection = 'request' | 'response';

export function createEvidenceFromHttp(
  programId: string,
  direction: HttpDirection,
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
  contentType = 'application/json',
  sourceUrl?: string
) {
  const sanitized = sanitizeHttpRequest(method, url, headers, body, contentType);
  const content = `HTTP ${method} ${url}\n\nHeaders:\n${JSON.stringify(sanitized.headers, null, 2)}\n\nBody:\n${sanitized.body}`;
  const contentHash = generateContentHash(content);

  return {
    programId,
    evidenceType: direction === 'request' ? 'http_request' : 'http_response',
    title: `${method} ${url}`,
    content,
    sourceUrl,
    verificationStatus: 'unverified' as const,
    contentHash,
    metadataJson: JSON.stringify({
      direction,
      method,
      url,
      contentType,
      redactedFields: sanitized.redactedFields,
    }),
  };
}