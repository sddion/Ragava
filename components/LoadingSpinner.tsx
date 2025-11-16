'use client';

import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  text?: string;
  variant?: 'default' | 'small' | 'large';
}

export default function LoadingSpinner({
  size,
  className = '',
  text,
  variant = 'default',
}: LoadingSpinnerProps) {
  const getSize = () => {
    if (size) return size;
    switch (variant) {
      case 'small':
        return 16;
      case 'large':
        return 32;
      default:
        return 20;
    }
  };

  const getTextSize = () => {
    switch (variant) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <Loader2 size={getSize()} className='animate-spin text-primary' />
      {text && (
        <span className={`${getTextSize()} text-muted-foreground`}>{text}</span>
      )}
    </div>
  );
}
