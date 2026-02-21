'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[120px] w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400/30 dark:border-zinc-800 dark:placeholder:text-zinc-600',
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
