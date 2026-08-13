import React, { useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Trash2, RotateCcw, Edit2, Check, X, Sparkles } from 'lucide-react';

/**
 * LineItemsTable — backend-driven per-line editing.
 *
 * Backend line-item shape (draft.line_items[i]):
 *   {
 *     line_number, description, category, rule_code,
 *     quantity, quantity_unit, quantity_hours, rate, total,
 *     source_email_id, source_attachment_id,
 *     ai_confidence, ai_reasoning, hours_reasoning,
 *     is_flagged, flag_reason, hit_cap,
 *     manual_override, removed
 *   }
 *
 * Editing model:
 *   * Click the pencil to open an inline edit row.
 *   * Save → PATCH /drafts/{id}/line-items/{n} — parent handles it.
 *   * Delete → soft-delete via DELETE endpoint; row stays but is greyed
 *     with an "Undo" button.
 *
 * Responsive:
 *   * Desktop: proper table.
 *   * Mobile: each line becomes a card (see the `md:hidden` branch).
 */
export default function LineItemsTable({
  lines,
  editable,
  rules = [],
  currency = 'CAD',
  onEdit,
  onDelete,
  onRestore,
}) {
  if (!lines || lines.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-body">
        No line items. {editable && 'Click "Add Line" above to add one.'}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-slate-50 text-small text-slate-600 uppercase tracking-wide">
              <tr>
                <th className="w-10 text-center py-2">#</th>
                <th className="text-left py-2 px-2 min-w-[200px]">Description</th>
                <th className="text-left py-2 px-2 min-w-[120px]">Rule</th>
                <th className="text-right py-2 px-2 w-20">Hrs</th>
                <th className="text-right py-2 px-2 w-24">Rate</th>
                <th className="text-right py-2 px-2 w-28">Total</th>
                <th className="w-20 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <LineRow
                  key={line.line_number}
                  line={line}
                  editable={editable}
                  rules={rules}
                  currency={currency}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRestore={onRestore}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {lines.map((line) => (
          <MobileLineCard
            key={line.line_number}
            line={line}
            editable={editable}
            rules={rules}
            currency={currency}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        ))}
      </div>
    </>
  );
}

/* ---------------- Desktop row ---------------- */

function LineRow({ line, editable, rules, currency, onEdit, onDelete, onRestore }) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState({
    description: line.description || '',
    quantity_hours: line.quantity_hours || 0,
    rate: line.rate || 0,
  });

  const isRemoved = line.removed;
  const isManual = line.manual_override;
  const isLowConfidence = line.ai_confidence === 'Low';
  const isFlagged = line.is_flagged;

  const save = () => {
    onEdit(line.line_number, {
      description: values.description,
      quantity_hours: Number(values.quantity_hours),
      rate: Number(values.rate),
    });
    setIsEditing(false);
  };

  const cancel = () => {
    setValues({
      description: line.description || '',
      quantity_hours: line.quantity_hours || 0,
      rate: line.rate || 0,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    const reason = prompt('Reason for removing this line?', '');
    if (reason === null) return;
    onDelete(line.line_number, reason || 'Removed by reviewer');
  };

  return (
    <tr
      className={clsx(
        'border-t border-slate-100',
        isRemoved && 'bg-slate-50 opacity-60 line-through',
        !isRemoved && !isManual && 'bg-blue-50/30',   // AI-suggested
        !isRemoved && isFlagged && 'border-l-4 border-l-warning',
        isEditing && 'bg-yellow-50'
      )}
    >
      <td className="text-center align-middle text-small text-slate-500 py-2">
        {line.line_number}
      </td>
      <td className="py-2 px-2 align-top">
        {isEditing ? (
          <input
            type="text"
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1"
            autoFocus
          />
        ) : (
          <div>
            <div className="flex items-start gap-1">
              {isFlagged && (
                <AlertTriangle
                  className="h-4 w-4 text-warning shrink-0 mt-0.5"
                  title={line.flag_reason}
                />
              )}
              {!isManual && !isRemoved && (
                <Sparkles
                  className="h-3.5 w-3.5 text-primary shrink-0 mt-1"
                  title="AI-suggested"
                />
              )}
              <span className="text-body">{line.description || '—'}</span>
            </div>
            {line.hours_reasoning && (
              <p className="text-small text-slate-500 mt-0.5 line-clamp-1">
                {line.hours_reasoning}
              </p>
            )}
          </div>
        )}
      </td>
      <td className="py-2 px-2 align-top">
        <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-small text-slate-700">
          {line.rule_code}
        </span>
      </td>
      <td className="py-2 px-2 text-right align-top">
        {isEditing ? (
          <input
            type="number"
            step="0.05"
            min="0"
            value={values.quantity_hours}
            onChange={(e) =>
              setValues({ ...values, quantity_hours: e.target.value })
            }
            className="w-20 rounded border border-slate-300 px-2 py-1 text-right"
          />
        ) : (
          <span className="font-medium">{Number(line.quantity_hours || 0).toFixed(2)}</span>
        )}
      </td>
      <td className="py-2 px-2 text-right align-top">
        {isEditing ? (
          <input
            type="number"
            step="1"
            min="0"
            value={values.rate}
            onChange={(e) => setValues({ ...values, rate: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 text-right"
          />
        ) : (
          <span>${Number(line.rate || 0).toFixed(2)}</span>
        )}
      </td>
      <td className="py-2 px-2 text-right font-semibold text-slate-900 align-top">
        ${Number(line.total || 0).toFixed(2)}
      </td>
      <td className="py-2 px-2 text-center align-top">
        {editable && (
          <div className="flex items-center justify-end gap-1">
            {isRemoved ? (
              <button
                onClick={() => onRestore(line.line_number)}
                className="p-1 rounded hover:bg-slate-200 text-slate-600"
                title="Restore"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : isEditing ? (
              <>
                <button
                  onClick={save}
                  className="p-1 rounded hover:bg-green-100 text-green-600"
                  title="Save"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={cancel}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-error"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

/* ---------------- Mobile card ---------------- */

function MobileLineCard({ line, editable, currency, onEdit, onDelete, onRestore }) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState({
    description: line.description || '',
    quantity_hours: line.quantity_hours || 0,
    rate: line.rate || 0,
  });

  const isRemoved = line.removed;
  const isManual = line.manual_override;
  const isFlagged = line.is_flagged;

  const save = () => {
    onEdit(line.line_number, {
      description: values.description,
      quantity_hours: Number(values.quantity_hours),
      rate: Number(values.rate),
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    const reason = prompt('Reason for removing this line?', '');
    if (reason === null) return;
    onDelete(line.line_number, reason || 'Removed by reviewer');
  };

  return (
    <div
      className={clsx(
        'rounded-lg border p-3',
        isRemoved
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : isFlagged
          ? 'bg-white border-warning'
          : !isManual
          ? 'bg-blue-50/30 border-slate-200'
          : 'bg-white border-slate-200'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="text-small text-slate-500">#{line.line_number}</span>
          {isFlagged && <AlertTriangle className="h-4 w-4 text-warning" />}
          {!isManual && !isRemoved && (
            <Sparkles className="h-3.5 w-3.5 text-primary" title="AI" />
          )}
          <span className="text-small text-primary bg-primary-50 px-1.5 py-0.5 rounded ml-1">
            {line.rule_code}
          </span>
        </div>
        <span className="text-body font-semibold text-slate-900">
          ${Number(line.total || 0).toFixed(2)}
        </span>
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-body"
            placeholder="Description"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-small text-slate-500">Hours</label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={values.quantity_hours}
                onChange={(e) => setValues({ ...values, quantity_hours: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-right"
              />
            </div>
            <div>
              <label className="text-small text-slate-500">Rate ($)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={values.rate}
                onChange={(e) => setValues({ ...values, rate: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-right"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-body text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-3 py-1.5 text-body bg-primary text-white rounded"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={clsx('text-body mt-2', isRemoved && 'line-through')}>
            {line.description || '—'}
          </p>
          <div className="mt-2 flex items-center justify-between text-small text-slate-600">
            <span>
              {Number(line.quantity_hours || 0).toFixed(2)} hrs × $
              {Number(line.rate || 0).toFixed(2)}
            </span>
            {editable && (
              <div className="flex gap-2">
                {isRemoved ? (
                  <button
                    onClick={() => onRestore(line.line_number)}
                    className="text-primary hover:underline"
                  >
                    Restore
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="text-error hover:underline"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
