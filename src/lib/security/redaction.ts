/**
 * Secret Redaction Library (Milestone 7.2).
 *
 * Redacts cookies, authorization headers, API keys/tokens, passwords, session
 * identifiers and common PII from evidence content before it is stored or sent
 * to an AI provider. Patterns are configurable; behaviour is conservative and
 * deliberately over-redacts rather than under-redacts.
 *
 * NOTE: like any regex-based scrubbing this cannot guarantee complete removal
 * of every secret shape. Researchers should review the redaction preview (M7.3)
 * before saving evidence.
 */

export const REDACTED_PLACEHOLDER = '[REDACTED]';

/** Dangerously sensitive header names (matched case-insensitively, substring). */
export const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-session-id',
  'www-authenticate',
];

/** Body/field names whose values must be redacted wherever they appear. */
export const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'api-key',
  'access_token',
  'refresh_token',
  'id_token',
  'client_secret',
  'private_key',
  'session_id',
  'sessionid',
  'auth',
];

/** "key": "value"   key=value   key: value   (JSON / form / URL query shapes) */
const KEY_VALUE_PATTERN = /(["']?)([\w.\-]+)\1\s*[:=]\s*/g;

/**
 * Scan key=value / key: value pairs. On a non-sensitive key, rewind the scan
 * to the next character instead of swallowing the rest of the string, so
 * nested pairs (e.g. `Cookie: SESSIONID=abc…`) are still inspected.
 */
function redactFieldPairs(input: string, keys: string[]): { content: string; fields: string[] } {
  const fields: string[] = [];
  let result = '';
  let lastWritten = 0;
  KEY_VALUE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = KEY_VALUE_PATTERN.exec(input)) !== null) {
    const key = match[2].toLowerCase();
    if (!keys.some((s) => key.includes(s))) {
      KEY_VALUE_PATTERN.lastIndex = match.index + 1;
      continue;
    }
    const valueStart = match.index + match[0].length;
    let valueEnd = valueStart;
    if (input[valueStart] === '"' || input[valueStart] === "'") {
      // Quoted value: redact everything between the quote characters.
      const close = input.indexOf(input[valueStart], valueStart + 1);
      valueEnd = valueStart + 1;
      while (valueEnd < close) valueEnd += 1;
      valueEnd = close === -1 ? input.length : close; // keep closing quote
    } else {
      while (valueEnd < input.length && !/[\s'",;&]/.test(input[valueEnd] as string)) valueEnd += 1;
    }
    if (valueEnd - valueStart < 4) continue;
    result += input.slice(lastWritten, valueStart) + REDACTED_PLACEHOLDER;
    lastWritten = valueEnd;
    fields.push(key);
    KEY_VALUE_PATTERN.lastIndex = valueEnd;
  }
  return { content: result + input.slice(lastWritten), fields };
}

/** Inline secret token shapes seen in raw text. */
const INLINE_SECRET_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { name: 'bearer', pattern: /\bBearer\s+[A-Za-z0-9\-_.~+/]+=*/gi },
  { name: 'basic', pattern: /\bBasic\s+[A-Za-z0-9+/=]+/gi },
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g },
  { name: 'raw-api-key', pattern: /\bsk\-[A-Za-z0-9\-_.]{20,}/g },
  { name: 'github', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { name: 'aws-key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'internal-token', pattern: /\b[Aa]uthorization:\s*\S+\s+\S+/g },
];

/** PII patterns. */
const PII_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { name: 'email', pattern: /(?<![\w.+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w.])/g },
  { name: 'credit-card', pattern: /\b(?:\d[ -]*?){13,19}\b/g },
  { name: 'phone', pattern: /(?:\+\d{1,3}[- ]?)?(?:\(\d{2,4}\)[ -]?)?\d{2,4}[ -]?\d{3,4}[ -]?\d{3,4}\b/g },
];

export interface RedactionOptions {
  extraSensitiveHeaders?: string[];
  extraSensitiveFields?: string[];
  extraPatterns?: RegExp[];
  /** Disable individual categories of redaction if needed. */
  disable?: Array<'fields' | 'inline' | 'pii'>;
}

function fieldKeys(options: RedactionOptions): string[] {
  return [...DEFAULT_SENSITIVE_FIELDS, ...(options.extraSensitiveFields ?? []).map((f) => f.toLowerCase())];
}

export interface RedactionResult {
  /** Redacted content. */
  content: string;
  /** Human-readable list of what was redacted, for the preview UI. */
  redactions: Array<{ field: string; category: string; count: number }>;
}

/**
 * Redact secrets and PII from arbitrary text (HTML, JSON, headers, bodies).
 * Conservative: matches key names that merely *contain* a sensitive field
 * name, and redacts long-ish values after equals/colon separators.
 */
export function redactText(input: string, options: RedactionOptions = {}): RedactionResult {
  const redactions = new Map<string, { field: string; category: string; count: number }>();
  let content = input;
  const bump = (field: string, category: string, count: number) => {
    if (count === 0) return;
    const found = redactions.get(field);
    if (found) found.count += count;
    else redactions.set(field, { field, category, count });
  };

  // Inline token shapes run first so phrasing like `Authorization: Bearer <jwt>`
  // is scrubbed as a whole before the field pass looks at key/value pairs.
  if (!options.disable?.includes('inline')) {
    for (const { pattern, name } of INLINE_SECRET_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let count = 0;
      content = content.replace(re, () => {
        count += 1;
        return REDACTED_PLACEHOLDER;
      });
      bump(name, 'inline', count);
    }
    // Custom user patterns.
    for (const pattern of options.extraPatterns ?? []) {
      const re = new RegExp(pattern.source, pattern.flags);
      let count = 0;
      content = content.replace(re, () => {
        count += 1;
        return REDACTED_PLACEHOLDER;
      });
      bump(String(pattern), 'custom', count);
    }
  }

  if (!options.disable?.includes('fields')) {
    const keys = fieldKeys(options);
    const before = content;
    const { content: after, fields } = redactFieldPairs(content, keys);
    content = after;
    for (const field of fields) bump(field, 'field', 1);
  }

  if (!options.disable?.includes('inline')) {
    for (const { pattern, name } of INLINE_SECRET_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let count = 0;
      content = content.replace(re, () => {
        count += 1;
        return REDACTED_PLACEHOLDER;
      });
      bump(name, 'inline', count);
    }
    // Custom user patterns.
    for (const pattern of options.extraPatterns ?? []) {
      const re = new RegExp(pattern.source, pattern.flags);
      let count = 0;
      content = content.replace(re, () => {
        count += 1;
        return REDACTED_PLACEHOLDER;
      });
      bump(String(pattern), 'custom', count);
    }
  }

  if (!options.disable?.includes('pii')) {
    for (const { pattern, name } of PII_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let count = 0;
      content = content.replace(re, () => {
        count += 1;
        return REDACTED_PLACEHOLDER;
      });
      bump(name, 'pii', count);
    }
  }

  return { content, redactions: [...redactions.values()] };
}

/** Redact a headers object (used for HTTP request/response evidence). */
export function redactHeaders(
  headers: Record<string, string>,
  options: RedactionOptions = {}
): { headers: Record<string, string>; redactedFields: string[] } {
  const allHeaders = [...DEFAULT_SENSITIVE_HEADERS, ...(options.extraSensitiveHeaders ?? []).map((h) => h.toLowerCase())];
  const result: Record<string, string> = {};
  const redactedFields: string[] = [];

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (allHeaders.some((s) => lower.includes(s))) {
      result[key] = REDACTED_PLACEHOLDER;
      redactedFields.push(key);
    } else {
      result[key] = redactText(value, options).content;
    }
  }
  return { headers: result, redactedFields };
}

/**
 * Full-text evidence redaction: applies text redaction then a headers pass —
 * single entry point for evidence ingestion (M7.2 acceptance: used in evidence
 * import and HTTP import).
 */
export function redactEvidenceText(content: string, options: RedactionOptions = {}): RedactionResult {
  return redactText(content, options);
}
