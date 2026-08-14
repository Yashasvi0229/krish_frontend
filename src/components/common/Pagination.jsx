import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

/**
 * Pagination per spec 4.2 (10/page) and 9.2 (10 | 25 | 50 | 100 with count).
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages = getVisiblePages(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-white">
      <div className="text-small text-slate-600">
        Showing <span className="font-medium">{start}</span>–
        <span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{total}</span>
      </div>
      <div className="flex items-center gap-4">
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label className="text-small text-slate-600">Per page:</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-small rounded border border-slate-300 px-2 py-1 focus:border-primary focus:outline-none"
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-1">
          <PageBtn
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </PageBtn>
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={i} className="px-2 text-slate-400 text-small">
                …
              </span>
            ) : (
              <PageBtn
                key={i}
                active={p === page}
                onClick={() => onPageChange(p)}
              >
                {p}
              </PageBtn>
            )
          )}
          <PageBtn
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </PageBtn>
        </div>
      </div>
    </div>
  );
}

function PageBtn({ children, active, disabled, onClick, ...rest }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'min-w-[32px] h-8 px-2 rounded-md text-small font-medium transition-colors',
        active
          ? 'bg-primary text-white'
          : 'text-slate-700 hover:bg-slate-100',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function getVisiblePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
