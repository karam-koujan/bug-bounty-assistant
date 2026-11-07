/**
 * Structured application logger (Milestone 7.7).
 *
 * - JSON lines to stdin-friendly output (machine-readable).
 * - Never logs secrets: messages and serialized error fields pass through the
 *   redaction library before emit.
 * - Log level controlled by LOG_LEVEL (debug|info|warn|error), default info.
 */
import { redactText } from '@/lib/security/redaction';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const CONFIGURED_LEVEL = LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info;

/** Flatten an unknown thrown value into a printable summary + stack. */
function errorMetadata(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function scrub(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactText(value).content;
  if (typeof value !== 'object' || depth > 4) return typeof value === 'object' ? '[object]' : value;
  const result: Record<string, unknown> | unknown[] = Array.isArray(value)
    ? value.map((v) => scrub(v, depth + 1))
    : Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, scrub(v, depth + 1)]));
  return result;
}

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < CONFIGURED_LEVEL) return;
  const scrubbed = scrub(meta ?? {});
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message: redactText(message).content,
    ...(scrubbed as Record<string, unknown>),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
