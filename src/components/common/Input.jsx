import React, { forwardRef } from 'react';
import clsx from 'clsx';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    required,
    hint,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    ...rest
  },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-body font-medium text-slate-700">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-body',
            'placeholder:text-slate-400',
            'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
            'disabled:bg-slate-50 disabled:text-slate-500',
            LeftIcon && 'pl-9',
            RightIcon && 'pr-9',
            error && 'border-error focus:border-error focus:ring-error/20',
            className
          )}
          {...rest}
        />
        {RightIcon && (
          <RightIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        )}
      </div>
      {error && <p className="text-small text-error">{error}</p>}
      {!error && hint && <p className="text-small text-slate-500">{hint}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, required, hint, rows = 3, className, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-body font-medium text-slate-700">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={clsx(
          'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-body',
          'placeholder:text-slate-400 resize-y',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
          error && 'border-error focus:border-error focus:ring-error/20',
          className
        )}
        {...rest}
      />
      {error && <p className="text-small text-error">{error}</p>}
      {!error && hint && <p className="text-small text-slate-500">{hint}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, required, hint, children, className, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-body font-medium text-slate-700">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-body',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
          error && 'border-error focus:border-error focus:ring-error/20',
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-small text-error">{error}</p>}
      {!error && hint && <p className="text-small text-slate-500">{hint}</p>}
    </div>
  );
});
