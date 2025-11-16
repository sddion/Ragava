'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type LazySectionProps = {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
};

export default function LazySection({
  children,
  rootMargin = '200px',
  minHeight = 120,
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={{ minHeight }}>
      {visible ? (
        children
      ) : (
        <div className='w-full animate-pulse'>
          <div className='h-6 bg-muted/60 rounded mb-3' />
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            <div className='h-28 bg-muted/40 rounded' />
            <div className='h-28 bg-muted/40 rounded' />
            <div className='h-28 bg-muted/40 rounded' />
          </div>
        </div>
      )}
    </div>
  );
}
