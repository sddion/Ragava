'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Custom405() {
  const router = useRouter();

  useEffect(() => {
    // Auto redirect to home page after 3 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className='min-h-screen bg-background flex items-center justify-center px-4'>
      <div className='max-w-md w-full text-center'>
        <div className='mb-8'>
          <div className='mx-auto w-24 h-24 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-6'>
            <Ban className='w-12 h-12 text-yellow-600 dark:text-yellow-400' />
          </div>
          <h1 className='text-4xl font-bold text-foreground mb-4'>405</h1>
          <h2 className='text-xl font-semibold text-foreground mb-2'>
            Method Not Allowed
          </h2>
          <p className='text-muted-foreground mb-8'>
            The request method is not supported for this resource. Please check
            your request and try again.
          </p>
          <p className='text-sm text-muted-foreground mb-4'>
            Redirecting to home page in 3 seconds...
          </p>
        </div>

        <div className='space-y-4'>
          <button
            onClick={() => window.history.back()}
            className='w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
            Go Back
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
          <p>Common causes:</p>
          <ul className='mt-2 space-y-1 text-left'>
            <li>• Using wrong HTTP method (GET, POST, PUT, DELETE)</li>
            <li>• API endpoint doesn&apos;t support the requested method</li>
            <li>• CORS or security restrictions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
