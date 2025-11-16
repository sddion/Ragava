'use client';

import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className='min-h-screen bg-background flex items-center justify-center px-4'>
          <div className='max-w-md w-full text-center'>
            <div className='mb-8'>
              <div className='mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6'>
                <AlertTriangle className='w-12 h-12 text-red-600 dark:text-red-400' />
              </div>
              <h1 className='text-4xl font-bold text-foreground mb-4'>
                Something went wrong!
              </h1>
              <h2 className='text-xl font-semibold text-foreground mb-2'>
                Global Error
              </h2>
              <p className='text-muted-foreground mb-8'>
                An unexpected error occurred. We&apos;re working to fix this
                issue.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className='mb-4 text-left'>
                  <summary className='cursor-pointer text-sm text-muted-foreground'>
                    Error Details (Development)
                  </summary>
                  <pre className='mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto'>
                    {error.message}
                    {error.digest && `\nDigest: ${error.digest}`}
                  </pre>
                </details>
              )}
            </div>

            <div className='space-y-4'>
              <button
                onClick={reset}
                className='w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors'
              >
                <RefreshCw className='w-4 h-4' />
                Try Again
              </button>

              <Link
                href='/'
                className='w-full flex items-center justify-center gap-2 px-6 py-3 bg-card text-foreground border border-border rounded-lg hover:bg-card/80 transition-colors'
              >
                <Home className='w-4 h-4' />
                Go Home
              </Link>
            </div>

            <div className='mt-8 text-sm text-muted-foreground'>
              <p>If this problem persists, please contact support.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
