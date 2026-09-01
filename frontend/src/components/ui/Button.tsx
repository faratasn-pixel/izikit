import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'social';
  children: ReactNode;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] px-6 py-3.5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-brand-foreground hover:bg-brand/90',
        variant === 'social' &&
          'border-[1.5px] border-black/[0.08] bg-white text-neutral-900 hover:bg-gray-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
