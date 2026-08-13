import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import clsx from 'clsx';

/**
 * Date range picker with quick options per spec 4.2 & 9.2:
 * Last 7 days | Last 30 days | This Month | Last Month | Custom
 */
const PRESETS = [
  { label: 'Last 7 days', getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'This Month', getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Last Month', getRange: () => {
    const lm = subMonths(new Date(), 1);
    return { from: startOfMonth(lm), to: endOfMonth(lm) };
  }},
];

export default function DateRangePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value?.from ? format(value.from, 'yyyy-MM-dd') : '');
  const [customTo, setCustomTo] = useState(value?.to ? format(value.to, 'yyyy-MM-dd') : '');

  const applyPreset = (preset) => {
    const range = preset.getRange();
    onChange({ ...range, label: preset.label });
    setOpen(false);
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      onChange({
        from: new Date(customFrom),
        to: new Date(customTo),
        label: 'Custom',
      });
      setOpen(false);
    }
  };

  const displayLabel = value?.label
    ? value.label
    : value?.from && value?.to
    ? `${format(value.from, 'MMM d')} – ${format(value.to, 'MMM d, yyyy')}`
    : 'All dates';

  return (
    <div className="relative">
      {label && <label className="block text-body font-medium text-slate-700 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-body hover:bg-slate-50 focus:border-primary focus:outline-none min-w-[180px]"
      >
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-left">{displayLabel}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white shadow-lg p-3">
            <div className="grid grid-cols-2 gap-1 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={clsx(
                    'text-small text-left px-2 py-1.5 rounded hover:bg-slate-100',
                    value?.label === p.label && 'bg-primary-50 text-primary'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-3">
              <p className="text-small text-slate-600 mb-2">Custom range</p>
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-small border border-slate-300 rounded px-2 py-1 flex-1"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-small border border-slate-300 rounded px-2 py-1 flex-1"
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                className="w-full bg-primary text-white text-small rounded py-1.5 hover:bg-primary-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
