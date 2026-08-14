import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    // Prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={() => closeOnBackdrop && onClose?.()}
      />
      <div
        className={clsx(
          'relative bg-white rounded-lg shadow-xl w-full flex flex-col max-h-[90vh]',
          sizeMap[size]
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
            <div>
              {title && (
                <h2 id="modal-title" className="text-h3 text-slate-900">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-small text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-primary rounded"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
