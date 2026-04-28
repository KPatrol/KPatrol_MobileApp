'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kpatrol-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg';

    const variants = {
      primary:
        'bg-kpatrol-500 text-white hover:bg-kpatrol-600 active:bg-kpatrol-700 shadow-glow-sm hover:shadow-glow-md',
      secondary:
        'bg-dark-card border border-dark-border text-dark-text hover:bg-dark-hover hover:border-dark-hover',
      ghost:
        'bg-transparent text-dark-muted hover:text-dark-text hover:bg-dark-card',
      danger:
        'bg-status-offline/20 border border-status-offline/30 text-status-offline hover:bg-status-offline/30',
      outline:
        'bg-transparent border border-kpatrol-500/50 text-kpatrol-400 hover:bg-kpatrol-500/10 hover:border-kpatrol-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm min-h-[36px]',
      md: 'px-4 py-2 text-sm min-h-[44px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
      icon: 'p-2 min-h-[44px] min-w-[44px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
