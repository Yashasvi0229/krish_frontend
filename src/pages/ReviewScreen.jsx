import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Search,
  Check,
  AlertTriangle,
  X,
  Send,
  RotateCcw,
  Mail,
  Paperclip,
  FileText as FileTextIcon,
  Plus,
} from 'lucide-react';
import Button from '../components/common/Button';
import { Input, Select, Textarea } from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import StatusPill from '../components/common/StatusPill';
import EmailCard from '../components/invoice/EmailCard';
import LineItemsTable from '../components/invoice/LineItemsTable';
import { Skeleton } from '../components/common/LoadingSkeleton';
import useDebounce from '../hooks/useDebounce';
import { draftApi, rulesApi, claimApi } from '../services/api';
import { formatCurrencyPrefixed } from '../utils/formatters';

/**
 * Review Screen — the reviewer's workbench.
 *
 * Backend data flow:
 *   * GET /drafts/{id}                → draft + line_items + client/insured details
 *   * GET /claims/{claim_id}/analyses → per-email + per-attachment AI results
 *   * PATCH/POST/DELETE /drafts/{id}/line-items/{n} → per-line edits
 *   * POST /drafts/{id}/submit-for-review → DRAFT → PENDING_PM
 *   * POST /drafts/{id}/advance → PM → HourVerify → RS → APPROVED (Excel!)
 *   * POST /drafts/{id}/reject → any PENDING_* → REJECTED
 *
 * Key design decision — per-line CRUD:
 *   The backend rewrites totals + writes an audit-trail entry on every
 *   line edit. So instead of holding a full local copy and PATCHing the
 *   whole draft, we call the per-line endpoints and refetch. Slower per
 *   keystroke, but every edit is durable and audited — the right trade
 *   for a compliance workflow.
 *
 * Responsive:
 *   * Desktop: split view (Source Data left | Draft right).
 *   * Mobile/tablet (<lg): tabs at top switch between panels.
 *   * Bottom action bar wraps and stacks buttons on narrow screens.
 */
export default function ReviewScreen() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activePanel, setActivePanel] = useState('draft');   // mobile tab
  const [filter, setFilter] = useState('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [returnToDraft, setReturnToDraft] = useState(true);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [attachmentModal, setAttachmentModal] = useState(null);
  const [addLineModal, setAddLineModal] = useState(false);

  const debouncedSearch = useDebounce(emailSearch, 300);

  // --- Data ---
  const draftQ = useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => draftApi.get(draftId).then((r) => r.data),
  });

  const draft = draftQ.data;
  const claimId = draft?.claim_id;

  // Emails are a separate resource (AI analyses of every source email).
  const analysesQ = useQuery({
    queryKey: ['analyses', claimId],
    queryFn: () => claimApi.getAnalyses(claimId).then((r) => r.data),
    enabled: !!claimId,
  });

  const rulesQ = useQuery({
    queryKey: ['rules'],
    queryFn: () => rulesApi.list().then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  // --- Derived ---
  // Merge draft's line_items with analyses to enrich each email with its
  // classification / hours contribution.
  const emailAnalyses = useMemo(() => {
    const rows = analysesQ.data?.items || [];
    return rows.filter((a) => a.kind === 'email');
  }, [analysesQ.data]);

  const attachmentAnalyses = useMemo(() => {
    const rows = analysesQ.data?.items || [];
    return rows.filter((a) => a.kind === 'attachment');
  }, [analysesQ.data]);

  const filteredEmails = useMemo(() => {
    let arr = emailAnalyses;
    if (filter === 'billable')
      arr = arr.filter((e) => e.classification === 'BILLABLE');
    if (filter === 'non-billable')
      arr = arr.filter((e) => e.classification === 'NON_BILLABLE');
    if (filter === 'flagged')
      arr = arr.filter((e) => e.confidence === 'Low');
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (e) =>
          e.subject?.toLowerCase().includes(q) ||
          e.from_email?.toLowerCase().includes(q) ||
          e.summary?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [emailAnalyses, filter, debouncedSearch]);

  const counts = useMemo(
    () => ({
      all: emailAnalyses.length,
      billable: emailAnalyses.filter((e) => e.classification === 'BILLABLE').length,
      non_billable: emailAnalyses.filter((e) => e.classification === 'NON_BILLABLE').length,
      flagged: emailAnalyses.filter((e) => e.confidence === 'Low').length,
    }),
    [emailAnalyses]
  );

  // --- Mutations ---
  const invalidate = () => qc.invalidateQueries({ queryKey: ['draft', draftId] });

  const editLineM = useMutation({
    mutationFn: ({ lineNumber, patch }) =>
      draftApi.editLine(draftId, lineNumber, patch),
    onSuccess: () => {
      toast.success('Line updated');
      invalidate();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || 'Failed to update line'),
  });

  const addLineM = useMutation({
    mutationFn: (payload) => draftApi.addLine(draftId, payload),
    onSuccess: () => {
      toast.success('Line added');
      setAddLineModal(false);
      invalidate();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || 'Failed to add line'),
  });

  const deleteLineM = useMutation({
    mutationFn: ({ lineNumber, reason }) =>
      draftApi.deleteLine(draftId, lineNumber, { reason }),
    onSuccess: () => {
      toast.success('Line removed');
      invalidate();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || 'Failed to remove line'),
  });

  const restoreLineM = useMutation({
    mutationFn: (lineNumber) => draftApi.restoreLine(draftId, lineNumber),
    onSuccess: () => {
      toast.success('Line restored');
      invalidate();
    },
  });

  const submitM = useMutation({
    mutationFn: (note) => draftApi.submitForReview(draftId, { note }),
    onSuccess: () => {
      toast.success('Submitted for review');
      setConfirmSubmit(false);
      invalidate();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || 'Failed to submit'),
  });

  const advanceM = useMutation({
    mutationFn: (note) => draftApi.advance(draftId, { note }),
    onSuccess: (res) => {
      const data = res.data;
      setConfirmAdvance(false);
      if (data.invoice_id) {
        toast.success('Invoice approved and generated!');
        navigate(`/invoices/${data.invoice_id}/preview`, { replace: true });
      } else {
        toast.success(`Advanced to ${data.stage}`);
        invalidate();
      }
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || 'Failed to advance'),
  });

  const rejectM = useMutation({
    mutationFn: () =>
      draftApi.reject(draftId, {
        reason: rejectReason.trim(),
        return_to_draft: returnToDraft,
      }),
    onSuccess: () => {
      toast.success(returnToDraft ? 'Rejected — reopened for editing' : 'Rejected');
      setRejectModal(false);
      setRejectReason('');
      invalidate();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || 'Failed to reject'),
  });

  const reopenM = useMutation({
    mutationFn: () => draftApi.reopen(draftId),
    onSuccess: () => {
      toast.success('Reopened for editing');
      invalidate();
    },
  });

  // --- Loading / error ---
  if (draftQ.isLoading || !draft) return <ReviewSkeleton />;
  if (draftQ.isError) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="text-body text-slate-600 mb-3">Failed to load draft.</p>
        <Button onClick={() => draftQ.refetch()}>Retry</Button>
      </div>
    );
  }

  const isEditable = draft.status === 'DRAFT' || draft.status === 'REJECTED';
  const isPendingStage = draft.status?.startsWith('PENDING_');
  const isApproved = draft.status === 'APPROVED';
  const isRejected = draft.status === 'REJECTED';
  const activeLines = (draft.line_items || []).filter((l) => !l.removed);
  const hasDuplicate = !!draft.duplicate_warning;

  // Advance-button label depends on next stage
  const advanceLabel = {
    PENDING_PM: 'Advance to Hours Verification',
    PENDING_HOUR_VERIFY: 'Advance to RS Review',
    PENDING_RS: 'Approve & Generate Invoice',
  }[draft.status] || 'Advance';

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-slate-100">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-4 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded hover:bg-slate-100 text-slate-600 shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-h3 text-slate-900 truncate">
            <span className="text-slate-500 font-normal">Draft:</span>{' '}
            <span className="text-primary">{draft.invoice_no}</span>
          </h1>
          <p className="text-small text-slate-500 truncate">
            {draft.client_details?.name} · {draft.insured_details?.insured_name}
          </p>
        </div>
        <div className="shrink-0">
          <StatusPill status={draft.status} />
        </div>
      </div>

      {/* Duplicate warning banner */}
      {hasDuplicate && (
        <div className="bg-yellow-50 border-b border-warning/30 px-4 py-2 text-body text-yellow-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="text-small">
            <p className="font-medium">Possible duplicate</p>
            <p>{draft.duplicate_warning.message}</p>
          </div>
        </div>
      )}

      {/* Rejected banner */}
      {isRejected && (
        <div className="bg-red-50 border-b border-error/30 px-4 py-2 text-body text-error flex items-start gap-2">
          <X className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 text-small">
            <p className="font-medium">Rejected</p>
            {draft.rejected_reason && <p>{draft.rejected_reason}</p>}
          </div>
          <Button size="sm" variant="secondary" onClick={() => reopenM.mutate()}>
            Reopen
          </Button>
        </div>
      )}

      {/* Mobile panel switcher */}
      <div className="lg:hidden bg-white border-b border-slate-200 flex">
        <button
          onClick={() => setActivePanel('emails')}
          className={`flex-1 py-2 text-body font-medium ${
            activePanel === 'emails'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-500'
          }`}
        >
          Source Data ({counts.all})
        </button>
        <button
          onClick={() => setActivePanel('draft')}
          className={`flex-1 py-2 text-body font-medium ${
            activePanel === 'draft'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-500'
          }`}
        >
          Draft Invoice
        </button>
      </div>

      {/* Split view (or single panel on mobile) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT — Source Data */}
        <div
          className={`w-full lg:w-1/2 flex flex-col lg:border-r border-slate-200 bg-slate-50 overflow-hidden ${
            activePanel !== 'emails' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-3 border-b border-slate-200 bg-white">
            <h2 className="text-h3 text-slate-900">Source Data</h2>
            <p className="text-small text-slate-500">
              {counts.all} emails · {attachmentAnalyses.length} attachments
            </p>
          </div>

          <div className="px-4 py-3 border-b border-slate-200 bg-white space-y-2">
            <div className="flex gap-1 flex-wrap">
              <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label={`All (${counts.all})`} />
              <FilterTab active={filter === 'billable'} onClick={() => setFilter('billable')} label={`Billable (${counts.billable})`} />
              <FilterTab active={filter === 'non-billable'} onClick={() => setFilter('non-billable')} label={`Non-billable (${counts.non_billable})`} />
              <FilterTab active={filter === 'flagged'} onClick={() => setFilter('flagged')} label={`Low conf (${counts.flagged})`} />
            </div>
            <Input
              leftIcon={Search}
              placeholder="Search subject, sender, summary…"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {analysesQ.isLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : filteredEmails.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No emails match"
                message="Try changing the filter or search."
              />
            ) : (
              filteredEmails.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  attachmentAnalyses={attachmentAnalyses.filter(
                    (a) => a.email_id === email.email_id
                  )}
                  onOpenAttachment={setAttachmentModal}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT — Draft */}
        <div
          className={`w-full lg:w-1/2 flex flex-col bg-white overflow-hidden ${
            activePanel !== 'draft' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-h3 text-slate-900">Draft Invoice</h2>
            <p className="text-small text-slate-500">
              {activeLines.length} active line
              {activeLines.length !== 1 && 's'} · Subtotal{' '}
              {formatCurrencyPrefixed(draft.subtotal, draft.currency)}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            {/* Invoice meta */}
            <SectionCard title="Invoice Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReadOnlyField label="Invoice #" value={draft.invoice_no} />
                <ReadOnlyField label="Invoice Date" value={draft.invoice_date} />
                <ReadOnlyField label="GNC File #" value={draft.gnc_file_no} />
                <ReadOnlyField
                  label="Billing Period"
                  value={`${draft.billing_period_start} → ${draft.billing_period_end}`}
                />
              </div>
            </SectionCard>

            {/* Client Details */}
            <SectionCard title="Client">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReadOnlyField
                  label="Name"
                  value={draft.client_details?.name}
                />
                <ReadOnlyField
                  label="Email"
                  value={draft.client_details?.email}
                />
                <ReadOnlyField
                  label="Phone"
                  value={draft.client_details?.phone}
                />
                <ReadOnlyField
                  label="Address"
                  value={draft.client_details?.address_line1}
                />
              </div>
            </SectionCard>

            {/* Insured + Loss */}
            <SectionCard title="Insured & Loss">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReadOnlyField
                  label="Insured"
                  value={draft.insured_details?.insured_name}
                />
                <ReadOnlyField
                  label="Claim #"
                  value={draft.loss_details?.claim_no}
                />
                <ReadOnlyField
                  label="Loss Type"
                  value={draft.loss_details?.loss_type}
                />
                <ReadOnlyField
                  label="Date of Loss"
                  value={draft.loss_details?.date_of_loss}
                />
              </div>
            </SectionCard>

            {/* Line items */}
            <SectionCard
              title="Line Items"
              action={
                isEditable && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={Plus}
                    onClick={() => setAddLineModal(true)}
                  >
                    Add Line
                  </Button>
                )
              }
            >
              <LineItemsTable
                lines={draft.line_items || []}
                editable={isEditable}
                rules={rulesQ.data?.items || []}
                currency={draft.currency}
                onEdit={(lineNumber, patch) =>
                  editLineM.mutate({ lineNumber, patch })
                }
                onDelete={(lineNumber, reason) =>
                  deleteLineM.mutate({ lineNumber, reason })
                }
                onRestore={(lineNumber) => restoreLineM.mutate(lineNumber)}
              />
            </SectionCard>

            {/* Totals */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between text-body text-slate-700">
                <span>Subtotal</span>
                <span className="font-semibold">
                  {formatCurrencyPrefixed(draft.subtotal, draft.currency)}
                </span>
              </div>
              <div className="flex justify-between text-body text-slate-700 mt-1">
                <span>GST ({draft.gst_percent || 0}%)</span>
                <span>{formatCurrencyPrefixed(draft.gst_value || 0, draft.currency)}</span>
              </div>
              <div className="flex justify-between text-h3 text-slate-900 mt-3 pt-3 border-t border-slate-300">
                <span>Grand Total</span>
                <span>
                  {formatCurrencyPrefixed(draft.grand_total, draft.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="bg-white border-t border-slate-200 px-3 sm:px-4 py-3 shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <p className="text-small text-slate-500 hidden sm:block">
            {isEditable ? 'Changes save automatically per edit' : 'View only'}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isEditable && (
              <Button
                onClick={() => setConfirmSubmit(true)}
                leftIcon={Send}
                loading={submitM.isPending}
              >
                Submit for Review
              </Button>
            )}
            {isPendingStage && (
              <>
                <Button
                  variant="dangerText"
                  onClick={() => setRejectModal(true)}
                >
                  Reject
                </Button>
                <Button
                  variant="success"
                  onClick={() => setConfirmAdvance(true)}
                  leftIcon={Check}
                  loading={advanceM.isPending}
                >
                  {advanceLabel}
                </Button>
              </>
            )}
            {isApproved && draft.approved_invoice_id && (
              <Button
                onClick={() =>
                  navigate(`/invoices/${draft.approved_invoice_id}/preview`)
                }
              >
                View Invoice
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Submit confirm */}
      <ConfirmModal
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => submitM.mutate(null)}
        title="Submit for review?"
        message={`This draft will move to PM Review. You won't be able to edit line items until it's returned to draft.`}
        confirmText="Submit"
        loading={submitM.isPending}
      />

      {/* Advance confirm — highlight if it's the final stage */}
      <ConfirmModal
        open={confirmAdvance}
        onClose={() => setConfirmAdvance(false)}
        onConfirm={() => advanceM.mutate(null)}
        title={
          draft.status === 'PENDING_RS'
            ? 'Approve and generate invoice?'
            : `Advance to next stage?`
        }
        message={
          draft.status === 'PENDING_RS'
            ? `The Excel invoice will be generated. Grand total: ${formatCurrencyPrefixed(
                draft.grand_total,
                draft.currency
              )}. This cannot be undone.`
            : `Advance from ${draft.status} to the next stage?`
        }
        confirmText={draft.status === 'PENDING_RS' ? 'Approve & Generate' : 'Advance'}
        variant={draft.status === 'PENDING_RS' ? 'success' : 'primary'}
        loading={advanceM.isPending}
      />

      {/* Reject modal */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Reject this draft"
        subtitle="Please explain what needs to change"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim()}
              loading={rejectM.isPending}
              onClick={() => rejectM.mutate()}
            >
              Reject
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. hours look inflated on line 12; please reduce."
        />
        <label className="flex items-center gap-2 mt-3 text-body text-slate-700">
          <input
            type="checkbox"
            checked={returnToDraft}
            onChange={(e) => setReturnToDraft(e.target.checked)}
            className="rounded border-slate-300"
          />
          Reopen for editing immediately (recommended)
        </label>
      </Modal>

      {/* Add line modal */}
      <AddLineModal
        open={addLineModal}
        onClose={() => setAddLineModal(false)}
        rules={rulesQ.data?.items || []}
        loading={addLineM.isPending}
        onSubmit={(payload) => addLineM.mutate(payload)}
      />

      {/* Attachment preview */}
      <Modal
        open={!!attachmentModal}
        onClose={() => setAttachmentModal(null)}
        title={attachmentModal?.filename || 'Attachment'}
        size="lg"
      >
        {attachmentModal && (
          <div className="space-y-3">
            <p className="text-small text-slate-500">
              <Paperclip className="inline h-3.5 w-3.5 mr-1" />
              {attachmentModal.filename}
            </p>
            {attachmentModal.summary && (
              <div className="rounded-md bg-primary-50 border border-primary-100 p-3">
                <p className="text-small font-medium text-primary mb-1">
                  AI Summary
                </p>
                <p className="text-small text-slate-700">
                  {attachmentModal.summary}
                </p>
              </div>
            )}
            {attachmentModal.reasoning && (
              <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                <p className="text-small font-medium text-slate-700 mb-1">
                  AI Reasoning
                </p>
                <p className="text-small text-slate-600">
                  {attachmentModal.reasoning}
                </p>
              </div>
            )}
            {attachmentModal.key_facts && (
              <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                <p className="text-small font-medium text-slate-700 mb-2">
                  Extracted Facts
                </p>
                <dl className="text-small grid grid-cols-2 gap-1">
                  {Object.entries(attachmentModal.key_facts)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <React.Fragment key={k}>
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="text-slate-800 truncate">{String(v)}</dd>
                      </React.Fragment>
                    ))}
                </dl>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------- Small helpers ------------- */

function SectionCard({ title, children, action }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body font-semibold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="text-small text-slate-500 mb-0.5">{label}</p>
      <p className="text-body text-slate-800 truncate">{value || '—'}</p>
    </div>
  );
}

function FilterTab({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-small rounded-md font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );
}

function AddLineModal({ open, onClose, rules, loading, onSubmit }) {
  const [ruleCode, setRuleCode] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quantityHours, setQuantityHours] = useState(0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setRuleCode('');
      setDescription('');
      setQuantity(1);
      setQuantityHours(0);
      setReason('');
    }
  }, [open]);

  const selectedRule = rules.find((r) => r.code === ruleCode);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add line item"
      subtitle="Add a line the AI missed"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ruleCode || !description || quantityHours <= 0}
            loading={loading}
            onClick={() =>
              onSubmit({
                rule_code: ruleCode,
                category: selectedRule?.category || 'Manual',
                description,
                quantity: Number(quantity),
                quantity_unit: selectedRule?.uom || 'flat',
                quantity_hours: Number(quantityHours),
                reason: reason || null,
              })
            }
          >
            Add
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Billing Rule"
          required
          value={ruleCode}
          onChange={(e) => setRuleCode(e.target.value)}
        >
          <option value="">Select a rule…</option>
          {rules.map((r) => (
            <option key={r.id} value={r.code}>
              {r.category} — {r.description}
            </option>
          ))}
        </Select>
        <Input
          label="Description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description of the work"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity"
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="Hours"
            type="number"
            step="0.05"
            min="0"
            value={quantityHours}
            onChange={(e) => setQuantityHours(e.target.value)}
            required
          />
        </div>
        <Textarea
          label="Reason (for audit trail)"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Site visit invoice was in the emails but AI missed it."
        />
      </div>
    </Modal>
  );
}

function ReviewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 border-r border-slate-200 p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="w-full lg:w-1/2 p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
