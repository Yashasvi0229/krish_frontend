import React from 'react';
import clsx from 'clsx';

/**
 * Status pill/badge per spec 2.3 Common Status Tags.
 * | Draft    | Gray   |
 * | Processing | Blue |
 * | Pending Review | Yellow |
 * | Approved | Green |
 * | Rejected | Red |
 * | Flagged  | Orange |
 */
const styles = {
  Draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  Processing: 'bg-blue-100 text-blue-700 ring-blue-200',
  'Pending Review': 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  Approved: 'bg-green-100 text-green-700 ring-green-200',
  Rejected: 'bg-red-100 text-red-700 ring-red-200',
  Flagged: 'bg-orange-100 text-orange-700 ring-orange-200',
};

const dotStyles = {
  Draft: 'bg-slate-400',
  Processing: 'bg-blue-500',
  'Pending Review': 'bg-yellow-500',
  Approved: 'bg-green-500',
  Rejected: 'bg-red-500',
  Flagged: 'bg-orange-500',
};

export default function StatusPill({ status, size = 'md', dot = true }) {
  const style = styles[status] || styles.Draft;
  const dotStyle = dotStyles[status] || dotStyles.Draft;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-small' : 'px-2.5 py-1 text-small',
        style
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dotStyle)} />}
      {status}
    </span>
  );
}
