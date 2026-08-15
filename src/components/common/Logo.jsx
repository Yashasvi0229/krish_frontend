import React from 'react';
import clsx from 'clsx';

/**
 * Brand logo — the GNC "Grt North Consulting" mark.
 *
 * Reused across TopNav, Login, and any other brand surface. Keeps every
 * call-site in sync when the logo ever changes: swap /public/gnc-logo.jpg
 * once, everything updates.
 *
 * Props:
 *   size:     'sm' | 'md' | 'lg' | 'xl'  → controls height (width auto)
 *   withText: bool                        → append "GNC Invoice Automation"
 *                                            next to the mark
 *   variant:  'default' | 'light'         → 'light' inverts the wordmark
 *                                            for dark backgrounds
 *
 * The image is intentionally loaded from /public (not src/assets) so it
 * ships as a static file the browser can cache aggressively.
 */
const SIZES = {
  sm: 'h-6',
  md: 'h-9',
  lg: 'h-12',
  xl: 'h-16',
};

export default function Logo({
  size = 'md',
  withText = false,
  variant = 'default',
  className = '',
}) {
  return (
    <div className={clsx('inline-flex items-center gap-2', className)}>
      <img
        src="/gnc-logo.jpg"
        alt="GNC — Grt North Consulting"
        className={clsx(SIZES[size], 'w-auto object-contain rounded')}
        // Prevent the image from adding awkward whitespace on load
        style={{ display: 'block' }}
      />
      {withText && (
        <span
          className={clsx(
            'font-semibold hidden sm:inline whitespace-nowrap',
            {
              md: 'text-body',
              lg: 'text-h3',
              xl: 'text-h2',
              sm: 'text-small',
            }[size],
            variant === 'light' ? 'text-white' : 'text-slate-900'
          )}
        >
          GNC Invoice Automation
        </span>
      )}
    </div>
  );
}
