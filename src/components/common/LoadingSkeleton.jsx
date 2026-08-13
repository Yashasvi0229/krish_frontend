import React from 'react';
import clsx from 'clsx';

export function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} />;
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="w-full">
      <div className="border-b border-slate-200 p-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-slate-100 p-3 flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
