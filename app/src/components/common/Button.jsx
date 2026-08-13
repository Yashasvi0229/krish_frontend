import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary:
    'bg-primary text-white hover:bg-primary-700 disabled:bg-primary-300 shadow-sm',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-60',
  danger:
    'bg-error text-white hover:bg-red-700 disabled:opacity-60 shadow-sm',
  success:
    'bg-success text-white hover:bg-green-700 disabled:opacity-60 shadow-sm',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 disabled:opacity-60',
  dangerText:
    'bg-white text-error border border-slate-300 hover:bg-red-50 disabled:opacity-60',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-small',
  md: 'px-4 py-2 text-body',
  lg: 'px-5 py-2.5 text-body',
  xl: 'px-6 py-3 text-body',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'cursor-not-allowed',
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : LeftIcon ? (
        <LeftIcon className="h-4 w-4" aria-hidden />
      ) : null}
      <span>{children}</span>
      {!loading && RightIcon && (
        <RightIcon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
