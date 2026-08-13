import React from 'react';
import { Input, Select } from '../common/Input';

/**
 * Totals section per spec 7.4:
 * Subtotal | GST % (editable) | GST Value | Discount (if applicable) | Grand Total | Currency
 */
export default function TotalsBox({
  subtotal,
  gstPercent,
  onGstPercentChange,
  discount = 0,
  discountLabel,
  currency = 'CAD',
  onCurrencyChange,
}) {
  const gstValue = (Number(subtotal) * Number(gstPercent || 0)) / 100;
  const grand = Number(subtotal) + gstValue - Number(discount || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-md ml-auto">
      <div className="space-y-3">
        <TotalRow label="Subtotal" value={fmt(subtotal, currency)} />

        <div className="flex items-center justify-between gap-3">
          <label className="text-body text-slate-700">GST %</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={gstPercent ?? 0}
            onChange={(e) => onGstPercentChange?.(parseFloat(e.target.value) || 0)}
            className="w-20 text-body text-right border border-slate-300 rounded px-2 py-1 focus:border-primary focus:outline-none"
          />
        </div>

        <TotalRow label="GST Value" value={fmt(gstValue, currency)} />

        {discount > 0 && (
          <TotalRow
            label={discountLabel || 'Discount'}
            value={`- ${fmt(discount, currency)}`}
            valueClass="text-error"
          />
        )}

        <div className="border-t border-slate-200 pt-3 flex items-center justify-between gap-3">
          <span className="text-h3 text-slate-900 font-semibold">Grand Total</span>
          <span className="text-h2 text-primary font-bold">
            {fmt(grand, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="text-small text-slate-500">Currency</label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange?.(e.target.value)}
            className="text-small border border-slate-300 rounded px-2 py-1"
          >
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-body text-slate-700">{label}</span>
      <span className={`text-body font-semibold text-slate-900 ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function fmt(v, currency) {
  const num = Number(v || 0);
  return `$${num.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
