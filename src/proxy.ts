/**
 * CSRF origin protection (Milestone 7.5) — Next.js 16 proxy convention
 * (middleware.ts was renamed to proxy.ts in this version).
 *
 * State-changing requests (POST/PUT/PATCH/DELETE) arriving with a
 * cross-origin Origin header are rejected. Same-origin requests, requests
 * without an Origin header (curl / scripts on localhost), and safe methods
 * pass through unchanged.
 */
import { NextResponse, type NextRequest } from 'next/server';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export default function proxy(request: NextRequest) {
  const isMutating = MUTATING_METHODS.has(request.method.toUpperCase());
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (isMutating && origin && host) {
    let crossOrigin = true;
    try {
      crossOrigin = new URL(origin).host !== host;
    } catch {
      crossOrigin = true; // malformed Origin — fail closed
    }
    if (crossOrigin) {
      return NextResponse.json(
        { error: 'Cross-origin request rejected' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  // API routes only: pages render with server actions protected by Next.js.
  matcher: '/api/:path*',
};
