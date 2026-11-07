/**
 * Global API route handling: input validation, CSRF origin checks, and
 * consistent error responses (Milestone 7.1 / 7.5).
 *
 * Every API route should wrap its handlers in `withApi`. The wrapper:
 *  1. Blocks unauthenticated cross-origin state-changing requests (CSRF).
 *  2. Maps Zod validation failures to a consistent 400 response shape.
 *  3. Logs unexpected errors through the structured logger without leaking
 *     secrets, returning a generic message to the client.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodType, type z } from 'zod';
import { logger } from '@/lib/logger';

export type ApiHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<Response>;

/** Safe-to-show error body used for all API failures. */
export interface ApiErrorBody {
  error: string;
  details?: Array<{ path: string; message: string }>;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF protection (M7.5). The app is a single-user local tool: any browser
 * origin other than the host serving the app must not be able to issue
 * state-changing requests. GET/HEAD are exempt.
 */
export function isCsrfViolation(request: Request): boolean {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return false;

  const origin = request.headers.get('origin');
  // Non-browser clients (curl, scripts) legitimately omit Origin; same-origin
  // requests either omit it or send the app's own host.
  if (!origin) return false;

  const host = request.headers.get('host');
  if (!host) return true;

  try {
    return new URL(origin).host !== host;
  } catch {
    return true; // malformed Origin — fail closed
  }
}

/** Consistent JSON error response. */
export function apiError(error: string, status = 400, details?: ApiErrorBody['details']): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error, details } as ApiErrorBody, { status });
}

/**
 * Validates `payload` against `schema` and returns parsed data, or throws a
 * ZodError (handled by `handleApiError`) so routes never touch unvalidated
 * input. Use inside handlers for every parsed body/query/param.
 */
export function validate<S extends ZodType>(schema: S, payload: unknown): z.output<S> {
  return schema.parse(payload) as z.output<S>;
}

/** Parse a JSON request body as validated input, or throw ZodError. */
export async function parseJsonBody<S extends ZodType>(request: NextRequest, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ZodError([{ code: 'invalid_type', expected: 'object', received: 'invalid_json', path: ['body'], message: 'Request body must be valid JSON' } as never]);
  }
  return validate(schema, body);
}

/** Map any thrown error to the standard response shape, logging internally. */
export function handleApiError(error: unknown, route: string): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return apiError('Validation failed', 400, error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })));
  }
  // Unexpected errors: log full details server-side, return generic message.
  logger.error(`Unhandled API error in ${route}`, { error });
  return apiError('Internal server error', 500);
}

/**
 * Wrap a route handler with CSRF checks + consistent error mapping.
 *
 * @example
 * export const POST = withApi('programs/create', async (request) => {
 *   const body = await parseJsonBody(request, programCreateSchema);
 *   ...
 * });
 */
export function withApi(routeName: string, handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    if (isCsrfViolation(request)) {
      return apiError('Cross-origin request rejected', 403);
    }
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, routeName);
    }
  };
}
