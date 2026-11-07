/**
 * File/Upload security helpers (Milestone 7.6).
 *
 * Size limits, content-type validation, filename/extension sanitization and
 * path traversal prevention for imported files (CSV/JSON imports, evidence
 * uploads). Nothing uploaded is ever executed; everything is treated as data.
 */

export const UPLOAD_LIMITS = {
  /** Maximum accepted upload size (bytes): 2 MB is ample for CSV/JSON proofs. */
  maxSizeBytes: 2 * 1024 * 1024,
  allowedContentTypes: ['text/csv', 'application/json', 'text/plain'],
  allowedExtensions: ['.csv', '.json', '.txt', '.md'],
} as const;

export interface UploadValidationResult {
  ok: boolean;
  errors: string[];
  /** Sanitized storage-safe filename (never includes directories). */
  safeFilename: string;
}

/** Strip every path component; keep a conservative basename. */
export function sanitizeFilename(name: string): string {
  const basename = name.split(/[\\/]/).pop() ?? 'upload';
  // Remove control chars, keep alphanumerics/-/_/./ /space, collapse runs.
  const cleaned = basename
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  const ext = getExtension(cleaned);
  const stem = cleaned.slice(0, cleaned.length - ext.length).replace(/\.+/g, '.').replace(/^\.+/, '');
  const safeStem = (stem || 'upload').slice(0, 100);
  return `${safeStem}${ext}`.toLowerCase() === '' ? 'upload' : `${safeStem}${ext}`;
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(idx) : '';
}

/** Validate an uploaded file's size, declared content type, and filename. */
export function validateUpload(
  filename: string,
  sizeBytes: number,
  declaredContentType: string,
  options: Partial<typeof UPLOAD_LIMITS> = {}
): UploadValidationResult {
  const limits = { ...UPLOAD_LIMITS, ...options };
  const errors: string[] = [];
  const safeFilename = sanitizeFilename(filename);

  if (sizeBytes > limits.maxSizeBytes) {
    errors.push(`File exceeds maximum size of ${limits.maxSizeBytes} bytes`);
  }
  if (sizeBytes === 0) {
    errors.push('File is empty');
  }

  const declared = (declaredContentType || '').split(';')[0].trim().toLowerCase();
  if (declared && (limits.allowedContentTypes as readonly string[]).indexOf(declared) === -1) {
    errors.push(`Content type "${declared}" is not allowed (accepted: ${limits.allowedContentTypes.join(', ')})`);
  }

  const ext = getExtension(safeFilename);
  if (ext && (limits.allowedExtensions as readonly string[]).indexOf(ext) === -1) {
    errors.push(`Extension "${ext}" is not allowed (accepted: ${limits.allowedExtensions.join(', ')})`);
  }
  // Executable or archive masquerading as data.
  if (/\.(sh|exe|js|html?|dll|bat|cmd|py|php|svg)$/i.test(filename)) {
    errors.push('Executable, script, or markup files are not accepted');
  }

  return { ok: errors.length === 0, errors, safeFilename };
}

/** Validate inline text payloads (CSV/JSON body upload). */
export function validateTextPayload(content: string, declaredContentType: string): UploadValidationResult {
  if (new TextEncoder().encode(content).length > UPLOAD_LIMITS.maxSizeBytes) {
    return { ok: false, errors: ['Payload exceeds maximum size of 2 MB'], safeFilename: '' };
  }
  const declared = (declaredContentType || '').split(';')[0].trim().toLowerCase();
  if (declared && (UPLOAD_LIMITS.allowedContentTypes as readonly string[]).indexOf(declared) === -1) {
    return { ok: false, errors: [`Content type "${declared}" is not allowed`], safeFilename: '' };
  }
  return { ok: true, errors: [], safeFilename: '' };
}

/** Guard against path traversal whenever an external path/filter is used. */
export function isSafeRelativePath(path: string): boolean {
  return !path.includes('..') && !path.startsWith('/') && !path.includes('\x00');
}
