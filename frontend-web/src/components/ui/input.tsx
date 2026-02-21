'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400/30 dark:border-zinc-800 dark:placeholder:text-zinc-600',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
