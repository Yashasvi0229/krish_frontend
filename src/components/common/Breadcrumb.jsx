import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumb per spec 5.2, 8.2.
 * items: [{ label, href? }]  — last item is current page (no href).
 */
export default function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex items-center gap-1 text-small text-slate-500">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1">
              {it.href && !isLast ? (
                <Link
                  to={it.href}
                  className="hover:text-primary hover:underline"
                >
                  {it.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'text-slate-700 font-medium' : ''}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {it.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
