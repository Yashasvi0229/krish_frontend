import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

export default function DropdownMenu({ items = [], trigger, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 focus-visible:ring-2 focus-visible:ring-primary"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger || <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <div
          className={clsx(
            'absolute z-30 mt-1 min-w-[180px] rounded-md border border-slate-200 bg-white shadow-lg py-1',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
              }}
              disabled={it.disabled}
              className={clsx(
                'w-full text-left px-3 py-2 text-body hover:bg-slate-50 flex items-center gap-2',
                it.disabled && 'opacity-40 cursor-not-allowed',
                it.danger && 'text-error hover:bg-red-50'
              )}
            >
              {it.icon && <it.icon className="h-4 w-4" />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
