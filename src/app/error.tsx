'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Full details go to the server-side log only; the user sees a generic page.
    logger.error('Unhandled client error', { digest: error.digest, error });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. The error has been logged. No research data was modified.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60">Reference: {error.digest}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
