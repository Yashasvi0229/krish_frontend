import { format, parseISO } from 'date-fns';

/** Format currency with prefix. Defaults to CAD per spec. */
export const formatCurrency = (amount, currency = 'CAD') => {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const num = Number(amount);
  return `${num.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

/** Format currency with $ prefix, e.g., $4,532.50 CAD */
export const formatCurrencyPrefixed = (amount, currency = 'CAD') => {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const num = Number(amount);
  return `$${num.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

/** Format date like "22 Jul 2026" */
export const formatDate = (value) => {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? parseISO(value) : value;
    return format(d, 'dd MMM yyyy');
  } catch {
    return '—';
  }
};

/** Format date + time */
export const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? parseISO(value) : value;
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return '—';
  }
};

/** Format "Saturday, 25 July 2026" for dashboard header */
export const formatFullDate = (value = new Date()) => {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, 'EEEE, d MMMM yyyy');
};

/** Format relative time — "2s ago", "5m ago" */
export const formatRelative = (value) => {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return format(d, 'dd MMM yyyy');
};

/** Truncate a string to n chars */
export const truncate = (str, n = 40) => {
  if (!str) return '';
  return str.length > n ? `${str.slice(0, n)}…` : str;
};

/** Format bytes as KB/MB */
export const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
