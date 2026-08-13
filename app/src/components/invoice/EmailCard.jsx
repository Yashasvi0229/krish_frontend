import React, { useState } from 'react';
import clsx from 'clsx';
import {
  ChevronDown,
  ChevronUp,
  Paperclip,
  FileText,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

/**
 * EmailCard — displays one email's AI analysis + its attachments.
 *
 * Backend shape (from GET /claims/{id}/analyses, kind='email'):
 *   {
 *     id, email_id, kind: 'email',
 *     subject, from_email, from_name, date,
 *     classification: 'BILLABLE' | 'NON_BILLABLE',
 *     summary, reasoning, confidence: 'High'|'Medium'|'Low',
 *     rule_code, category, quantity, quantity_hours,
 *     key_facts, is_flagged, flag_reason
 *   }
 *
 * Attachments (kind='attachment') are passed via prop, filtered upstream
 * by email_id, and rendered as compact rows with their own AI summary.
 *
 * View-only — editing lives on the Draft panel (per-line CRUD).
 */
export default function EmailCard({
  email,
  attachmentAnalyses = [],
  onOpenAttachment,
}) {
  const [expanded, setExpanded] = useState(false);

  // Left color strip visually classifies the email at a glance.
  const stripColor = {
    BILLABLE: 'bg-success',
    NON_BILLABLE: 'bg-slate-400',
  }[email.classification] || 'bg-slate-300';

  const confidenceStyle = {
    High: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-red-100 text-red-700',
  }[email.confidence] || 'bg-slate-100 text-slate-700';

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-card">
      <div className="flex">
        <div className={clsx('w-1 shrink-0', stripColor)} />

        <div className="flex-1 p-3 sm:p-4 min-w-0">
          {/* Header: from + date */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-slate-900 truncate">
                {email.from_name || email.from_email || 'Unknown sender'}
              </p>
              {email.from_email && (
                <p className="text-small text-slate-500 truncate">
                  {email.from_email}
                </p>
              )}
            </div>
            {email.date && (
              <div className="text-small text-slate-500 shrink-0 hidden sm:block">
                {formatShortDate(email.date)}
              </div>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-slate-100 text-slate-500 shrink-0"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Subject */}
          {email.subject && (
            <p className="text-body font-semibold text-slate-900 mt-2 line-clamp-2">
              {email.subject}
            </p>
          )}

          {/* AI Summary — one-line, italic */}
          {email.summary && (
            <p className="text-small text-slate-600 italic mt-1 line-clamp-2">
              <Sparkles className="inline h-3 w-3 mr-1 text-primary" />
              {email.summary}
            </p>
          )}

          {/* Tag row */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <Badge className={
              email.classification === 'BILLABLE'
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-700'
            }>
              {email.classification === 'BILLABLE' ? 'Billable' : 'Non-billable'}
            </Badge>
            {email.category && (
              <Badge className="bg-primary-50 text-primary">
                {email.category}
              </Badge>
            )}
            {email.confidence && (
              <Badge className={confidenceStyle}>
                {email.confidence} confidence
              </Badge>
            )}
            {attachmentAnalyses.length > 0 && (
              <span className="inline-flex items-center gap-1 text-small text-slate-600 ml-1">
                <Paperclip className="h-3 w-3" />
                {attachmentAnalyses.length}
              </span>
            )}
          </div>

          {/* Suggested billing hours */}
          {email.classification === 'BILLABLE' && email.quantity_hours != null && (
            <p className="text-small text-slate-700 mt-2">
              → Suggested:{' '}
              <span className="font-semibold">
                {email.quantity_hours} hrs
              </span>{' '}
              ({email.rule_code})
            </p>
          )}

          {/* Expanded section — reasoning + attachments */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
              {email.reasoning && (
                <div className="rounded-md bg-primary-50 border border-primary-100 p-3">
                  <p className="text-small font-medium text-primary mb-1">
                    AI Reasoning
                  </p>
                  <p className="text-small text-slate-700">{email.reasoning}</p>
                </div>
              )}

              {email.is_flagged && email.flag_reason && (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                  <p className="text-small font-medium text-yellow-800 mb-1">
                    Flagged for review
                  </p>
                  <p className="text-small text-slate-700">{email.flag_reason}</p>
                </div>
              )}

              {attachmentAnalyses.length > 0 && (
                <div>
                  <p className="text-small font-medium text-slate-700 mb-2">
                    Attachments
                  </p>
                  <div className="space-y-2">
                    {attachmentAnalyses.map((att) => (
                      <AttachmentRow
                        key={att.id}
                        att={att}
                        onOpen={() => onOpenAttachment?.(att)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-small font-medium',
        className
      )}
    >
      {children}
    </span>
  );
}

function AttachmentRow({ att, onOpen }) {
  const ext = (att.filename?.split('.').pop() || '').toLowerCase();
  const Icon = ['pdf'].includes(ext)
    ? FileText
    : ['xlsx', 'xls', 'csv'].includes(ext)
    ? FileSpreadsheet
    : ['docx', 'doc'].includes(ext)
    ? FileText
    : ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
    ? ImageIcon
    : File;
  const iconColor = ['pdf'].includes(ext)
    ? 'text-red-500'
    : ['xlsx', 'xls', 'csv'].includes(ext)
    ? 'text-green-600'
    : ['docx', 'doc'].includes(ext)
    ? 'text-blue-600'
    : 'text-slate-500';

  return (
    <button
      onClick={onOpen}
      className="w-full text-left border border-slate-200 rounded-md p-3 hover:border-primary transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className={clsx('h-5 w-5 shrink-0', iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-slate-900 truncate">
            {att.filename || 'Attachment'}
          </p>
          {att.rule_code && (
            <p className="text-small text-primary">
              {att.rule_code} · {att.quantity_hours} hrs
            </p>
          )}
        </div>
      </div>
      {att.summary && (
        <p className="text-small text-slate-600 italic mt-2 line-clamp-2">
          {att.summary}
        </p>
      )}
    </button>
  );
}

function formatShortDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
